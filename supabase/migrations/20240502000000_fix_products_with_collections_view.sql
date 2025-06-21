-- Fix products_with_collections view to work with collection_id instead of junction table

-- Ensure collections table has all required fields
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS slug VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Drop the old view
DROP VIEW IF EXISTS public.products_with_collections;

-- Create the new view that works with collection_id
CREATE OR REPLACE VIEW public.products_with_collections AS
SELECT 
    p.*,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'slug', c.slug,
                'is_featured', c.is_featured
            ) 
            ORDER BY c.name
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::jsonb
    ) as collections
FROM 
    public.products p
LEFT JOIN 
    public.collections c ON p.collection_id = c.id
GROUP BY 
    p.id;

-- Set up RLS for the view
ALTER VIEW public.products_with_collections OWNER TO postgres;
GRANT SELECT ON public.products_with_collections TO authenticated; 