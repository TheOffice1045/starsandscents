-- Fix RLS policies for store_settings and store_roles tables
-- Allows public read access and authenticated users to manage their own store data

-- ============================================
-- STORE_SETTINGS POLICIES
-- ============================================

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can insert their own store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can update their own store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can view their own store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;

-- SELECT: Allow anyone (public storefront needs this)
CREATE POLICY "Anyone can view store settings"
ON public.store_settings
FOR SELECT
USING (true);

-- INSERT: Only authenticated users for their own stores
CREATE POLICY "Users can insert their own store settings"
ON public.store_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.user_id = auth.uid())
);

-- UPDATE: Only authenticated users for their own stores
CREATE POLICY "Users can update their own store settings"
ON public.store_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.user_id = auth.uid())
);

-- ============================================
-- STORE_ROLES POLICIES
-- ============================================

ALTER TABLE public.store_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow store users to view roles" ON public.store_roles;
DROP POLICY IF EXISTS "Allow store owners to manage roles" ON public.store_roles;
DROP POLICY IF EXISTS "Users can view store roles" ON public.store_roles;
DROP POLICY IF EXISTS "Users can insert store roles" ON public.store_roles;
DROP POLICY IF EXISTS "Users can update store roles" ON public.store_roles;
DROP POLICY IF EXISTS "Users can delete store roles" ON public.store_roles;

-- SELECT: Authenticated users can view roles for their stores
CREATE POLICY "Users can view store roles"
ON public.store_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.user_id = auth.uid())
);

-- INSERT: Store owners can create roles
CREATE POLICY "Users can insert store roles"
ON public.store_roles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.user_id = auth.uid())
);

-- UPDATE: Store owners can update roles
CREATE POLICY "Users can update store roles"
ON public.store_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.user_id = auth.uid())
);

-- DELETE: Store owners can delete roles
CREATE POLICY "Users can delete store roles"
ON public.store_roles
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.user_id = auth.uid())
);
