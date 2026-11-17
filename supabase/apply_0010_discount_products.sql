-- Stars and Scents: discount_products table. Safe to re-run.
BEGIN;

-- Products a discount is limited to (discounts.applies_to = 'products'). The admin
-- discount pages read and write this table, but an earlier migration
-- (20240101000000_drop_product_tables.sql) dropped it and nothing recreated it, so
-- saving a product-specific discount failed. Admin-only: the storefront never reads it.
CREATE TABLE IF NOT EXISTS public.discount_products (
  discount_id uuid NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (discount_id, product_id)
);

CREATE INDEX IF NOT EXISTS discount_products_product_id_idx ON public.discount_products (product_id);

ALTER TABLE public.discount_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage discount products" ON public.discount_products;
CREATE POLICY "Admins manage discount products"
  ON public.discount_products FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

COMMIT;

-- Check: should say true
SELECT to_regclass('public.discount_products') IS NOT NULL AS discount_products_exists;
