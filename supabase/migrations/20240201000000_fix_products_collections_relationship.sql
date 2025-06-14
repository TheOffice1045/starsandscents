-- Fix products and collections relationship

-- First, check if the collection_id column exists in the products table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'collection_id'
    ) THEN
        -- If we have both collection_id in products AND the junction table,
        -- we need to migrate the data from the direct relationship to the junction table
        INSERT INTO public.collection_products (collection_id, product_id, created_at)
        SELECT collection_id, id, NOW()
        FROM public.products
        WHERE collection_id IS NOT NULL
        ON CONFLICT (collection_id, product_id) DO NOTHING;
        
        -- Then drop the column from products table
        ALTER TABLE public.products DROP COLUMN IF EXISTS collection_id;
    END IF;
END
$$;

-- Create indexes for better performance on the junction table
CREATE INDEX IF NOT EXISTS idx_collection_products_collection_id ON public.collection_products (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product_id ON public.collection_products (product_id);

-- Create index on collections slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections (slug);

-- Create a function to update product's updated_at when its collections change
CREATE OR REPLACE FUNCTION update_product_on_collection_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.products
        SET updated_at = NOW()
        WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.products
        SET updated_at = NOW()
        WHERE id = OLD.product_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update product's updated_at when its collections change
DROP TRIGGER IF EXISTS update_product_on_collection_change_trigger ON public.collection_products;
CREATE TRIGGER update_product_on_collection_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.collection_products
FOR EACH ROW
EXECUTE FUNCTION update_product_on_collection_change();

-- Create a view to easily get products with their collections
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
    public.collection_products cp ON p.id = cp.product_id
LEFT JOIN 
    public.collections c ON cp.collection_id = c.id
GROUP BY 
    p.id;

-- Set up RLS for the view
ALTER VIEW public.products_with_collections OWNER TO postgres;
GRANT SELECT ON public.products_with_collections TO authenticated;