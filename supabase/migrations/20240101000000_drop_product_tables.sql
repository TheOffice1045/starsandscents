-- Drop product-related tables only if they exist
DO $$ 
BEGIN
  -- Check and drop product_images if it exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_images') THEN
    DROP TABLE public.product_images;
  END IF;
  
  -- Check and drop product_collections if it exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_collections') THEN
    DROP TABLE public.product_collections;
  END IF;
  
  -- Check and drop product_sales_channels if it exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_sales_channels') THEN
    DROP TABLE public.product_sales_channels;
  END IF;
  
  -- Check and drop discount_products if it exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'discount_products') THEN
    DROP TABLE public.discount_products;
  END IF;
  
  -- Check and drop products if it exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    DROP TABLE public.products;
  END IF;
END $$;

-- Remove any related storage policies
DO $$ 
BEGIN
  DELETE FROM storage.policies 
  WHERE name LIKE '%product%';
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist, nothing to do
    NULL;
END $$;

-- Remove any related triggers or functions
DROP TRIGGER IF EXISTS on_product_created ON products;
DROP TRIGGER IF EXISTS on_product_updated ON products;
DROP FUNCTION IF EXISTS handle_product_created();
DROP FUNCTION IF EXISTS handle_product_updated();