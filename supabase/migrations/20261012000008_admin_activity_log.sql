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
