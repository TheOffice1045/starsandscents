-- Fix Supabase CRITICAL security lint: "rls_disabled_in_public" on public.stores
--
-- public.stores was created outside migrations (dashboard/SQL editor) with RLS OFF,
-- so anyone with the project URL + anon key could read/edit/delete every store row.
-- This enables RLS and scopes access to the row OWNER (stores.user_id = auth.uid()),
-- which matches the only code that touches this table (app/admin/settings/page.tsx:
-- select id where user_id = <current user>, and insert { user_id: <current user> }).
--
-- Notes:
--  * Server routes use the service_role key, which bypasses RLS, so they are unaffected.
--  * The public storefront never reads `stores` (it reads `store_settings`), so no
--    anon/public read policy is needed here.

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- A user may read only their own store row.
DROP POLICY IF EXISTS "Users can view their own store" ON public.stores;
CREATE POLICY "Users can view their own store"
  ON public.stores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- A user may create a store only for themselves.
DROP POLICY IF EXISTS "Users can create their own store" ON public.stores;
CREATE POLICY "Users can create their own store"
  ON public.stores FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- A user may update only their own store, and cannot reassign it to someone else.
DROP POLICY IF EXISTS "Users can update their own store" ON public.stores;
CREATE POLICY "Users can update their own store"
  ON public.stores FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- A user may delete only their own store.
DROP POLICY IF EXISTS "Users can delete their own store" ON public.stores;
CREATE POLICY "Users can delete their own store"
  ON public.stores FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
