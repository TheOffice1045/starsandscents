-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'draft',
  quantity INTEGER NOT NULL DEFAULT 0,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collections table
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  description TEXT,
  slug VARCHAR UNIQUE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for many-to-many relationship between products and collections
CREATE TABLE IF NOT EXISTS public.collection_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, product_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Allow authenticated users to view all products" 
  ON public.products FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert products" 
  ON public.products FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update products" 
  ON public.products FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to delete products" 
  ON public.products FOR DELETE 
  TO authenticated 
  USING (true);

-- Create policies for collections
CREATE POLICY "Allow authenticated users to view all collections" 
  ON public.collections FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert collections" 
  ON public.collections FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update collections" 
  ON public.collections FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to delete collections" 
  ON public.collections FOR DELETE 
  TO authenticated 
  USING (true);

-- Create policies for collection_products
CREATE POLICY "Allow authenticated users to view all collection_products" 
  ON public.collection_products FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert collection_products" 
  ON public.collection_products FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete collection_products" 
  ON public.collection_products FOR DELETE 
  TO authenticated 
  USING (true);

-- Create function to update product updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update product updated_at timestamp
CREATE TRIGGER update_product_updated_at_trigger
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION update_product_updated_at();

-- Create function to update collection updated_at timestamp
CREATE OR REPLACE FUNCTION update_collection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update collection updated_at timestamp
CREATE TRIGGER update_collection_updated_at_trigger
BEFORE UPDATE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION update_collection_updated_at();