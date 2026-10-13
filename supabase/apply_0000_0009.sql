-- Stars and Scents: migrations 0000-0009, all-or-nothing. Safe to re-run.
BEGIN;

-- ===== 20261012000000_role_based_rls.sql
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
ALTER TABLE public.sales_channels        ENABLE ROW LEVEL SECURITY;
-- collection_products and product_sales_channels don't exist in every database
-- (the live project has neither); they are secured further down only if present.

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

CREATE POLICY "Admins manage sales channels"
  ON public.sales_channels FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

-- Optional join tables: secure them only where they exist.
DO $$
BEGIN
  IF to_regclass('public.collection_products') IS NOT NULL THEN
    ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Public reads collection products"
      ON public.collection_products FOR SELECT
      TO anon, authenticated
      USING (true);
    CREATE POLICY "Admins manage collection products"
      ON public.collection_products FOR ALL
      TO authenticated
      USING (public.is_store_admin())
      WITH CHECK (public.is_store_admin());
  END IF;

  IF to_regclass('public.product_sales_channels') IS NOT NULL THEN
    ALTER TABLE public.product_sales_channels ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins manage product sales channels"
      ON public.product_sales_channels FOR ALL
      TO authenticated
      USING (public.is_store_admin())
      WITH CHECK (public.is_store_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Not covered here (no migration defines them, so their live policies are
-- unknown): customers, discounts, discount_products, discount_collections,
-- product_images, product_reviews/reviews, wishlist, store_settings (payment
-- secrets are still publicly readable there). Capture those tables in
-- migrations, then secure them the same way.
-- ---------------------------------------------------------------------------

-- ===== 20261012000001_scrub_payment_secrets.sql
-- store_settings is publicly readable (the storefront needs it), so it must never
-- hold payment secrets. The admin Payments tab used to save the Stripe secret key
-- and PayPal client secret into store_settings.payment_methods; the form no longer
-- accepts them (see PaymentSettings.tsx). This removes any that were already saved.
--
-- IMPORTANT: if a real key was ever entered, it has been readable by anyone with
-- the public anon key. Deleting it here does not undo that — roll the Stripe
-- secret key and the PayPal client secret in their dashboards.

-- The column was never created by a migration; make it reproducible.
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS payment_methods jsonb DEFAULT '[]'::jsonb;

DO $$
BEGIN
  -- Only touch the column if it is jsonb (it may predate this migration as another type).
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'store_settings'
      AND column_name = 'payment_methods'
      AND data_type = 'jsonb'
  ) THEN
    UPDATE public.store_settings
    SET payment_methods = (
      SELECT COALESCE(
        jsonb_agg(
          CASE
            WHEN jsonb_typeof(method -> 'settings') = 'object'
              THEN jsonb_set(method, '{settings}', (method -> 'settings') - 'secretKey' - 'clientSecret')
            ELSE method
          END
        ),
        '[]'::jsonb
      )
      FROM jsonb_array_elements(payment_methods) AS method
    )
    WHERE jsonb_typeof(payment_methods) = 'array'
      AND payment_methods::text ~ '(secretKey|clientSecret)';
  ELSE
    RAISE NOTICE 'store_settings.payment_methods is not jsonb; scrub it manually.';
  END IF;
END $$;

-- ===== 20261012000002_order_refunds.sql
-- Track how much of an order has been refunded. payment_status moves to
-- 'partially_refunded' / 'refunded' (set by /api/admin/orders/[id]/refund).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_refunded_amount_valid;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_refunded_amount_valid
  CHECK (refunded_amount >= 0 AND refunded_amount <= total);

-- ===== 20261012000003_new_customer_notification.sql
-- Notify store admins when someone creates an account. Signup happens in the
-- browser against Supabase Auth, so the app server never sees it; a trigger on
-- auth.users is the only reliable place to catch it.
--
-- The notification is best-effort: any failure here is downgraded to a warning
-- so it can never block a signup.

CREATE OR REPLACE FUNCTION public.notify_admins_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Team members being invited are not customers.
  IF EXISTS (
    SELECT 1 FROM store_users su WHERE lower(su.email) = lower(NEW.email)
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, title, message)
  SELECT DISTINCT su.user_id,
         'New Customer',
         COALESCE(NEW.email, 'A new customer') || ' created an account.'
  FROM store_users su
  JOIN store_roles sr ON sr.id = su.role_id
  WHERE su.status = 'active'
    AND su.user_id IS NOT NULL
    AND sr.name IN ('Owner', 'Admin', 'Manager');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admins_new_customer failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins_new_customer() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created_notify_admins ON auth.users;
CREATE TRIGGER on_auth_user_created_notify_admins
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_customer();

-- ===== 20261012000004_store_shipping_methods.sql
-- Shipping configuration edited in /indoorme/settings (Shipping tab) and read by
-- /api/checkout to build Stripe shipping options. See lib/shipping.ts.
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS shipping_methods JSONB;

-- The shipping option the customer chose at checkout (set by the Stripe webhook,
-- shown on the admin order and fulfillment pages).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_method TEXT;

-- ===== 20261012000005_customer_cancel_rules.sql
-- Tighten what customers can cancel from their account page, and tell admins
-- when they do (a paid order that gets cancelled still needs a refund).
-- Replaces guard_customer_order_update() from 20261012000000_role_based_rls.sql.

-- Reusable: one notification row per active Owner/Admin/Manager.
CREATE OR REPLACE FUNCTION public.notify_store_admins(p_title text, p_message text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO notifications (user_id, title, message)
  SELECT DISTINCT su.user_id, p_title, p_message
  FROM store_users su
  JOIN store_roles sr ON sr.id = su.role_id
  WHERE su.status = 'active'
    AND su.user_id IS NOT NULL
    AND sr.name IN ('Owner', 'Admin', 'Manager');
$$;

-- Supabase grants new functions to anon/authenticated explicitly, so revoking
-- from PUBLIC alone would still let anyone spam admins through the RPC endpoint.
REVOKE ALL ON FUNCTION public.notify_store_admins(text, text) FROM PUBLIC, anon, authenticated;

-- SECURITY DEFINER so it can call notify_store_admins(), which customers can't.
-- auth.uid() still reflects the customer making the change.
CREATE OR REPLACE FUNCTION public.guard_customer_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent record;
  new_status text := to_jsonb(NEW) ->> 'status';
  old_status text := to_jsonb(OLD) ->> 'status';
BEGIN
  -- Service role / direct DB connections have no auth.uid(); admins are unrestricted.
  IF auth.uid() IS NULL OR public.is_store_admin() THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Customers may only change the status of their own orders';
  END IF;

  IF new_status IS NOT DISTINCT FROM old_status THEN
    RETURN NEW;
  END IF;

  IF new_status IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'Customers may only cancel orders';
  END IF;

  -- Look at the order itself (or the item's parent order).
  IF TG_TABLE_NAME = 'orders' THEN
    SELECT OLD.id AS id, to_jsonb(OLD) ->> 'order_number' AS order_number,
           OLD.fulfillment_status AS fulfillment_status, OLD.payment_status AS payment_status
      INTO parent;
  ELSE
    SELECT o.id, o.order_number, o.fulfillment_status, o.payment_status
      INTO parent
      FROM orders o
     WHERE o.id = (to_jsonb(NEW) ->> 'order_id')::uuid;
  END IF;

  IF parent.fulfillment_status IS DISTINCT FROM 'unfulfilled' THEN
    RAISE EXCEPTION 'This order has already been shipped and can no longer be cancelled';
  END IF;

  IF parent.payment_status IN ('refunded', 'partially_refunded') THEN
    RAISE EXCEPTION 'This order has been refunded and can no longer be cancelled';
  END IF;

  PERFORM public.notify_store_admins(
    'Order Cancelled',
    CASE WHEN TG_TABLE_NAME = 'orders'
      THEN 'Customer cancelled order ' || COALESCE(parent.order_number, parent.id::text)
      ELSE 'Customer cancelled an item on order ' || COALESCE(parent.order_number, parent.id::text)
    END
    || CASE WHEN parent.payment_status = 'paid' THEN ' (paid: refund needed).' ELSE '.' END
  );

  RETURN NEW;
END;
$$;

-- ===== 20261012000006_contact_messages.sql
-- Contact-form inbox. Messages are written by /api/contact (service role) and
-- read/managed only by store admins on /indoorme/messages.
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  replied_at timestamptz
);

CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage contact messages" ON public.contact_messages;
CREATE POLICY "Admins manage contact messages"
  ON public.contact_messages FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

-- ===== 20261012000007_abandoned_checkouts.sql
-- Stripe checkouts that expired without payment (written by the Stripe webhook on
-- checkout.session.expired; that event must be enabled on the webhook endpoint).
CREATE TABLE IF NOT EXISTS public.abandoned_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text NOT NULL UNIQUE,
  customer_email text,
  customer_name text,
  amount_total numeric(10, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz,
  expired_at timestamptz NOT NULL DEFAULT now(),
  contacted_at timestamptz,
  dismissed boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS abandoned_checkouts_expired_at_idx ON public.abandoned_checkouts (expired_at DESC);

ALTER TABLE public.abandoned_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage abandoned checkouts" ON public.abandoned_checkouts;
CREATE POLICY "Admins manage abandoned checkouts"
  ON public.abandoned_checkouts FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());

-- ===== 20261012000008_admin_activity_log.sql
-- Activity log: who changed what, recorded by triggers so it covers every path
-- (admin pages, API routes, Stripe webhook, SQL editor). Read on /indoorme/activity.
CREATE TABLE IF NOT EXISTS public.admin_activity (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,                -- NULL = system (Stripe webhook, service role, SQL)
  actor_email text,
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,         -- INSERT / UPDATE / DELETE
  label text,                   -- human-friendly name of the row (order number, title...)
  changed_fields text[]
);

CREATE INDEX IF NOT EXISTS admin_activity_created_at_idx ON public.admin_activity (created_at DESC);

ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read activity" ON public.admin_activity;
CREATE POLICY "Admins read activity"
  ON public.admin_activity FOR SELECT
  TO authenticated
  USING (public.is_store_admin());
-- No insert/update/delete policies: only the trigger (SECURITY DEFINER) writes.

CREATE OR REPLACE FUNCTION public.log_admin_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_data jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  changed text[];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(n.key ORDER BY n.key)
      INTO changed
      FROM jsonb_each(to_jsonb(NEW)) n
      JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
     WHERE n.value IS DISTINCT FROM o.value
       AND n.key NOT IN ('updated_at');
    -- Touch-only updates aren't worth a log line.
    IF changed IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO admin_activity (actor_id, actor_email, table_name, record_id, action, label, changed_fields)
  VALUES (
    auth.uid(),
    auth.jwt() ->> 'email',
    TG_TABLE_NAME,
    row_data ->> 'id',
    TG_OP,
    COALESCE(row_data ->> 'order_number', row_data ->> 'title', row_data ->> 'name',
             row_data ->> 'code', row_data ->> 'email', row_data ->> 'store_name'),
    changed
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Logging must never block the real change.
  RAISE WARNING 'log_admin_activity failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_activity() FROM PUBLIC;

-- Attach to every admin-managed table that exists in this database.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders', 'products', 'collections', 'discounts', 'customers',
    'store_settings', 'store_users', 'store_roles'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS log_admin_activity ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER log_admin_activity AFTER INSERT OR UPDATE OR DELETE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity()', t);
    END IF;
  END LOOP;
END $$;

-- ===== 20261012000009_order_stock_restored.sql
-- Set once an order's items have been put back into stock (by a full refund with
-- "return items to stock", or when an unshipped order is deleted), so stock is
-- never returned twice.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_restored boolean NOT NULL DEFAULT false;


COMMIT;

-- Check: every row should say true
SELECT 'is_store_admin()' AS item, to_regprocedure('public.is_store_admin()') IS NOT NULL AS ok
UNION ALL SELECT 'orders policies', EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins manage orders')
UNION ALL SELECT 'new customer notification', to_regprocedure('public.notify_admins_new_customer()') IS NOT NULL
UNION ALL SELECT 'contact_messages', to_regclass('public.contact_messages') IS NOT NULL
UNION ALL SELECT 'abandoned_checkouts', to_regclass('public.abandoned_checkouts') IS NOT NULL
UNION ALL SELECT 'admin_activity', to_regclass('public.admin_activity') IS NOT NULL
UNION ALL SELECT 'orders.stock_restored', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'stock_restored');
