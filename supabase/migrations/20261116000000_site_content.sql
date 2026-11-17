-- Editable storefront content (admin → Site Content).
-- One row per section (id = section key, e.g. 'home.hero'); content is jsonb
-- validated by the app (lib/site-content.ts). Anyone can read it (the public
-- pages render it); only Owner/Admin can write. Pages fall back to their
-- original copy for any section without a row, so applying this changes nothing
-- visible until someone saves.

CREATE OR REPLACE FUNCTION public.is_store_owner_or_admin()
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
      AND sr.name IN ('Owner', 'Admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_store_owner_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_store_owner_or_admin() TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.site_content (
  id text PRIMARY KEY,
  title text NOT NULL,             -- human label, shown in the activity log
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads site content" ON public.site_content;
CREATE POLICY "Anyone reads site content"
  ON public.site_content FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Owner/Admin write site content" ON public.site_content;
CREATE POLICY "Owner/Admin write site content"
  ON public.site_content FOR ALL
  TO authenticated
  USING (public.is_store_owner_or_admin())
  WITH CHECK (public.is_store_owner_or_admin());

-- Record edits on /indoorme/activity (function from 20261012000008).
DROP TRIGGER IF EXISTS log_admin_activity ON public.site_content;
CREATE TRIGGER log_admin_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();

-- Images uploaded from Site Content. Public read; uploads go through
-- /api/admin/site-content/upload (Owner/Admin check, service role), so no
-- client write policies are needed. 5 MB, common image types only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-content', 'site-content', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
