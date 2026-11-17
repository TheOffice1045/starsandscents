-- Product bundles ("fixed set, shared stock").
--
-- A bundle is an ordinary products row (title, price, images, status) plus rows
-- in product_bundle_items listing the candles it contains. Because it is a
-- normal product, the shop, cart, Stripe checkout, order items and admin all
-- work unchanged. Stock is handled here in the database:
--
--   * update_product_stock(bundle, n) takes n sets out of each component
--     (negative n puts them back, which restockOrder uses), so the Stripe
--     webhook, manual orders, refunds and order deletes all stay correct.
--   * A bundle's own products.quantity is always "how many full sets the
--     component stock can make"; a trigger recomputes it whenever a component's
--     stock or the bundle contents change, so every existing stock check and
--     "sold out" badge keeps working.
--   * Bundles can't contain bundles.

CREATE TABLE IF NOT EXISTS public.product_bundle_items (
  bundle_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 100),
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bundle_id, product_id),
  CHECK (bundle_id <> product_id)
);

CREATE INDEX IF NOT EXISTS product_bundle_items_product_idx ON public.product_bundle_items (product_id);

ALTER TABLE public.product_bundle_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads bundle items" ON public.product_bundle_items;
CREATE POLICY "Anyone reads bundle items"
  ON public.product_bundle_items FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage bundle items" ON public.product_bundle_items;
CREATE POLICY "Admins manage bundle items"
  ON public.product_bundle_items FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

-- ---------------------------------------------------------------------------
-- No nesting: a bundle can't be a component, and a component can't be a bundle.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_bundle_nesting()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM product_bundle_items WHERE bundle_id = NEW.product_id) THEN
    RAISE EXCEPTION 'A bundle cannot contain another bundle';
  END IF;
  IF EXISTS (SELECT 1 FROM product_bundle_items WHERE product_id = NEW.bundle_id) THEN
    RAISE EXCEPTION 'This product is inside another bundle, so it cannot be a bundle itself';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_bundle_nesting ON public.product_bundle_items;
CREATE TRIGGER guard_bundle_nesting
  BEFORE INSERT OR UPDATE ON public.product_bundle_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_bundle_nesting();

-- ---------------------------------------------------------------------------
-- Sets available = min over components of floor(stock / per-set quantity).
-- Returns NULL for a product that isn't a bundle.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bundle_available(p_bundle_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT MIN(GREATEST(COALESCE(p.quantity, 0), 0) / bi.quantity)::integer
  FROM product_bundle_items bi
  JOIN products p ON p.id = bi.product_id
  WHERE bi.bundle_id = p_bundle_id;
$$;

-- Keep a bundle's quantity equal to what its components allow, whatever writes it.
CREATE OR REPLACE FUNCTION public.sync_bundle_quantity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  available integer;
BEGIN
  available := public.bundle_available(NEW.id);
  IF available IS NOT NULL THEN
    NEW.quantity := available;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_bundle_quantity ON public.products;
CREATE TRIGGER sync_bundle_quantity
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.sync_bundle_quantity();

-- When a component's stock changes, refresh the bundles that contain it.
CREATE OR REPLACE FUNCTION public.refresh_bundles_for_component()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quantity IS DISTINCT FROM OLD.quantity THEN
    UPDATE products p
       SET quantity = public.bundle_available(p.id)
     WHERE p.id IN (SELECT bundle_id FROM product_bundle_items WHERE product_id = NEW.id)
       AND p.quantity IS DISTINCT FROM public.bundle_available(p.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS refresh_bundles_for_component ON public.products;
CREATE TRIGGER refresh_bundles_for_component
  AFTER UPDATE OF quantity ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.refresh_bundles_for_component();

-- When bundle contents change, refresh that bundle.
CREATE OR REPLACE FUNCTION public.refresh_bundle_after_items_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  b uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.bundle_id ELSE NEW.bundle_id END;
BEGIN
  -- Touch the row; sync_bundle_quantity sets the real number. A bundle emptied
  -- of all items goes back to 0 so it can't be sold with nothing inside.
  UPDATE products
     SET quantity = COALESCE(public.bundle_available(b), 0)
   WHERE id = b;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS refresh_bundle_after_items_change ON public.product_bundle_items;
CREATE TRIGGER refresh_bundle_after_items_change
  AFTER INSERT OR UPDATE OR DELETE ON public.product_bundle_items
  FOR EACH ROW EXECUTE FUNCTION public.refresh_bundle_after_items_change();

-- ---------------------------------------------------------------------------
-- Stock changes: same signature and behaviour for normal products; bundles
-- move their components instead. Still SECURITY INVOKER, so only callers that
-- may update products (admins, service role) can use it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_product_stock(p_product_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM product_bundle_items WHERE bundle_id = p_product_id) THEN
    UPDATE products p
       SET quantity = GREATEST(p.quantity - p_quantity * bi.quantity, 0),
           updated_at = NOW()
      FROM product_bundle_items bi
     WHERE bi.bundle_id = p_product_id
       AND p.id = bi.product_id;
    -- The component triggers refresh this bundle's quantity.
  ELSE
    UPDATE products
       SET quantity = GREATEST(quantity - p_quantity, 0),
           updated_at = NOW()
     WHERE id = p_product_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Replace a bundle's contents in one transaction (admin editor).
-- p_items: [{"product_id": "...", "quantity": 1}, ...]; [] turns the bundle
-- back into a normal product. SECURITY INVOKER: RLS limits it to admins.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_bundle_items(p_bundle_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM product_bundle_items WHERE bundle_id = p_bundle_id;
  INSERT INTO product_bundle_items (bundle_id, product_id, quantity, position)
  SELECT p_bundle_id, (e.value ->> 'product_id')::uuid, (e.value ->> 'quantity')::integer, e.ordinality::integer
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) WITH ORDINALITY AS e(value, ordinality);
END;
$$;

REVOKE ALL ON FUNCTION public.set_bundle_items(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_bundle_items(uuid, jsonb) TO authenticated;
