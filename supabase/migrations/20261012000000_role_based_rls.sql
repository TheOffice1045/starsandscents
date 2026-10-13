-- Replace "any authenticated user" RLS with role-based access.
--
-- Before this migration, every signed-in account (including ordinary shoppers)
-- could read/update/delete all orders, addresses and products through the anon
-- key. After it:
--   * store admins (active store_users row with Owner/Admin/Manager) can do everything
--   * customers can read (and cancel) only their own orders
--   * the public storefront can read active products and collections
--   * the service role (Stripe webhook) keeps full access, as it bypasses RLS
--
-- NOT APPLIED AUTOMATICALLY. Before running it, confirm your own login has an
-- active Owner/Admin/Manager row in store_users — the guard below aborts if no
-- admin exists, but it can't tell whether that admin is you.

-- ---------------------------------------------------------------------------
-- Lock-out guard
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.store_users su
    JOIN public.store_roles sr ON sr.id = su.role_id
    WHERE su.status = 'active' AND sr.name IN ('Owner', 'Admin', 'Manager')
  ) THEN
    RAISE EXCEPTION 'No active Owner/Admin/Manager in store_users; applying this would lock everyone out of the admin. Aborting.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Admin check (SECURITY DEFINER so it can read store_users/store_roles
-- without tripping their own RLS or recursing)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_store_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM store_users su
    JOIN store_roles sr ON sr.id = su.role_id
    WHERE su.user_id = auth.uid()
      AND su.status = 'active'
      AND sr.name IN ('Owner', 'Admin', 'Manager')
  );
$$;

REVOKE ALL ON FUNCTION public.is_store_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_store_admin() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Drop every existing policy on the tables we are re-securing, so permissive
-- leftovers (under any name, in any environment) can't linger.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'orders', 'order_items', 'shipping_addresses', 'billing_addresses', 'order_history',
        'products', 'collections', 'collection_products', 'sales_channels', 'product_sales_channels'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_addresses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_addresses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sales_channels ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Orders
-- Customers match on customer_id or on the email in their JWT (the storefront
-- looks orders up by customer_email). This assumes email confirmation is on;
-- if it is off, anyone could register with someone else's address.
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins manage orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

CREATE POLICY "Customers read own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR lower(customer_email) = lower(auth.jwt() ->> 'email')
  );

CREATE POLICY "Customers update own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR lower(customer_email) = lower(auth.jwt() ->> 'email')
  )
  WITH CHECK (
    customer_id = auth.uid()
    OR lower(customer_email) = lower(auth.jwt() ->> 'email')
  );

-- Customers may only cancel (the account page does this from the browser);
-- they must not be able to mark their own order paid, change totals, etc.
CREATE OR REPLACE FUNCTION public.guard_customer_order_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Service role / direct DB connections have no auth.uid(); admins are unrestricted.
  IF auth.uid() IS NULL OR public.is_store_admin() THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Customers may only change the status of their own orders';
  END IF;

  IF (to_jsonb(NEW) ->> 'status') IS DISTINCT FROM (to_jsonb(OLD) ->> 'status')
     AND (to_jsonb(NEW) ->> 'status') IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'Customers may only cancel orders';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_customer_order_update ON public.orders;
CREATE TRIGGER guard_customer_order_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_order_update();

DROP TRIGGER IF EXISTS guard_customer_order_update ON public.order_items;
CREATE TRIGGER guard_customer_order_update
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_order_update();

-- ---------------------------------------------------------------------------
-- Order children: visible to a customer exactly when the parent order is
-- (the subquery on orders is itself filtered by the policies above).
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins manage order items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

CREATE POLICY "Customers read own order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id));

CREATE POLICY "Customers update own order items"
  ON public.order_items FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id));

CREATE POLICY "Admins manage shipping addresses"
  ON public.shipping_addresses FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

CREATE POLICY "Customers read own shipping addresses"
  ON public.shipping_addresses FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = shipping_addresses.order_id));

CREATE POLICY "Admins manage billing addresses"
  ON public.billing_addresses FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

CREATE POLICY "Customers read own billing addresses"
  ON public.billing_addresses FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = billing_addresses.order_id));

CREATE POLICY "Admins manage order history"
  ON public.order_history FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

CREATE POLICY "Customers read own order history"
  ON public.order_history FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_history.order_id));

-- ---------------------------------------------------------------------------
-- Catalog: the storefront reads active products/collections (also logged out);
-- only admins write, and only admins see drafts/archived items.
-- ---------------------------------------------------------------------------
CREATE POLICY "Public reads active products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR public.is_store_admin());

CREATE POLICY "Admins manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

CREATE POLICY "Public reads collections"
  ON public.collections FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage collections"
  ON public.collections FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

CREATE POLICY "Public reads collection products"
  ON public.collection_products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage collection products"
  ON public.collection_products FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

CREATE POLICY "Admins manage sales channels"
  ON public.sales_channels FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

CREATE POLICY "Admins manage product sales channels"
  ON public.product_sales_channels FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

-- ---------------------------------------------------------------------------
-- Not covered here (no migration defines them, so their live policies are
-- unknown): customers, discounts, discount_products, discount_collections,
-- product_images, product_reviews/reviews, wishlist, store_settings (payment
-- secrets are still publicly readable there). Capture those tables in
-- migrations, then secure them the same way.
-- ---------------------------------------------------------------------------
