-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10, 2),
  cost_per_item DECIMAL(10, 2),
  collection_id UUID REFERENCES public.collections(id), -- Add this line
  status VARCHAR NOT NULL DEFAULT 'draft',
  track_quantity BOOLEAN DEFAULT true,
  quantity INTEGER DEFAULT 0,
  weight DECIMAL(10, 2),
  weight_unit VARCHAR DEFAULT 'kg',
  taxable BOOLEAN DEFAULT true,
  online_store BOOLEAN DEFAULT true,
  point_of_sale BOOLEAN DEFAULT true,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

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

-- Create index for faster searches
CREATE INDEX idx_products_title ON public.products (title);
CREATE INDEX idx_products_status ON public.products (status);