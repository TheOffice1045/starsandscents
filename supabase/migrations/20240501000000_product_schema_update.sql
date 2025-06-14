-- Update products table with all fields from the product creation form
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10, 2),
  cost_per_item DECIMAL(10, 2),
  profit DECIMAL(10, 2) GENERATED ALWAYS AS (price - COALESCE(cost_per_item, 0)) STORED,
  margin DECIMAL(10, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN price > 0 THEN ((price - COALESCE(cost_per_item, 0)) / price) * 100
      ELSE 0
    END
  ) STORED,
  collection_id UUID REFERENCES public.collections(id),
  images TEXT[],
  charge_tax BOOLEAN DEFAULT false,
  track_quantity BOOLEAN DEFAULT false,
  quantity INTEGER DEFAULT 0,
  is_physical BOOLEAN DEFAULT true,
  weight DECIMAL(10, 2),
  weight_unit TEXT DEFAULT 'lb',
  online_store BOOLEAN DEFAULT true,
  point_of_sale BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create collections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sales channels table
CREATE TABLE IF NOT EXISTS public.sales_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default sales channels
INSERT INTO public.sales_channels (name)
VALUES ('Online Store'), ('Point of Sale')
ON CONFLICT DO NOTHING;

-- Create product_sales_channels junction table
CREATE TABLE IF NOT EXISTS public.product_sales_channels (
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.sales_channels(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, channel_id)
);

-- Create RLS policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sales_channels ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can read products"
  ON public.products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert products"
  ON public.products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products"
  ON public.products FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete products"
  ON public.products FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create similar policies for collections and sales channels tables

-- Create functions for product management
CREATE OR REPLACE FUNCTION public.create_product(
  product_data JSONB,
  sales_channels TEXT[]
) RETURNS UUID AS $$
DECLARE
  new_product_id UUID;
  channel_id UUID;
BEGIN
  -- Insert the product
  INSERT INTO public.products (
    title,
    description,
    status,
    price,
    compare_at_price,
    cost_per_item,
    collection_id,
    images,
    charge_tax,
    track_quantity,
    quantity,
    is_physical,
    weight,
    weight_unit
  ) VALUES (
    product_data->>'title',
    product_data->>'description',
    COALESCE(product_data->>'status', 'active'),
    (product_data->>'price')::DECIMAL,
    NULLIF((product_data->>'compare_at_price')::TEXT, '')::DECIMAL,
    NULLIF((product_data->>'cost_per_item')::TEXT, '')::DECIMAL,
    NULLIF((product_data->>'collection_id')::TEXT, '')::UUID,
    COALESCE((product_data->'images')::TEXT[]::TEXT[], '{}'),
    COALESCE((product_data->>'charge_tax')::BOOLEAN, false),
    COALESCE((product_data->>'track_quantity')::BOOLEAN, false),
    COALESCE((product_data->>'quantity')::INTEGER, 0),
    COALESCE((product_data->>'is_physical')::BOOLEAN, true),
    NULLIF((product_data->>'weight')::TEXT, '')::DECIMAL,
    COALESCE(product_data->>'weight_unit', 'lb')
  )
  RETURNING id INTO new_product_id;

  -- Add sales channels
  IF sales_channels IS NOT NULL THEN
    FOR i IN 1..array_length(sales_channels, 1) LOOP
      SELECT id INTO channel_id FROM public.sales_channels WHERE name = sales_channels[i];
      IF channel_id IS NOT NULL THEN
        INSERT INTO public.product_sales_channels (product_id, channel_id)
        VALUES (new_product_id, channel_id);
      END IF;
    END LOOP;
  END IF;

  RETURN new_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update product
CREATE OR REPLACE FUNCTION public.update_product(
  product_id UUID,
  product_data JSONB,
  sales_channels TEXT[]
) RETURNS BOOLEAN AS $$
DECLARE
  channel_id UUID;
BEGIN
  -- Update the product
  UPDATE public.products SET
    title = COALESCE(product_data->>'title', title),
    description = COALESCE(product_data->>'description', description),
    status = COALESCE(product_data->>'status', status),
    price = COALESCE((product_data->>'price')::DECIMAL, price),
    compare_at_price = NULLIF((product_data->>'compare_at_price')::TEXT, '')::DECIMAL,
    cost_per_item = NULLIF((product_data->>'cost_per_item')::TEXT, '')::DECIMAL,
    collection_id = NULLIF((product_data->>'collection_id')::TEXT, '')::UUID,
    images = COALESCE((product_data->'images')::TEXT[]::TEXT[], images),
    charge_tax = COALESCE((product_data->>'charge_tax')::BOOLEAN, charge_tax),
    track_quantity = COALESCE((product_data->>'track_quantity')::BOOLEAN, track_quantity),
    quantity = COALESCE((product_data->>'quantity')::INTEGER, quantity),
    is_physical = COALESCE((product_data->>'is_physical')::BOOLEAN, is_physical),
    weight = NULLIF((product_data->>'weight')::TEXT, '')::DECIMAL,
    weight_unit = COALESCE(product_data->>'weight_unit', weight_unit),
    updated_at = now()
  WHERE id = product_id;

  -- Update sales channels
  DELETE FROM public.product_sales_channels WHERE product_id = product_id;
  
  IF sales_channels IS NOT NULL THEN
    FOR i IN 1..array_length(sales_channels, 1) LOOP
      SELECT id INTO channel_id FROM public.sales_channels WHERE name = sales_channels[i];
      IF channel_id IS NOT NULL THEN
        INSERT INTO public.product_sales_channels (product_id, channel_id)
        VALUES (product_id, channel_id);
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS products_collection_id_idx ON public.products(collection_id);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products(status);
CREATE INDEX IF NOT EXISTS products_title_idx ON public.products(title);