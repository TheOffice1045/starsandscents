-- Fix Supabase security lint: "security_definer_view" on public.products_with_collections
--
-- Views default to SECURITY DEFINER behavior: they read the underlying tables with
-- the view OWNER's rights (postgres), bypassing the querying user's RLS. Setting
-- security_invoker = true makes the view enforce the CALLER's RLS instead, so the
-- view can never return rows the querying role isn't allowed to see.
--
-- Requires PostgreSQL 15+ (Supabase satisfies this). Safe with current policies:
-- products / collections / collection_products all grant SELECT TO authenticated
-- USING (true), and the view is only granted to authenticated, so no role loses
-- access. This simply makes future RLS tightening actually apply to the view.

ALTER VIEW public.products_with_collections SET (security_invoker = true);
