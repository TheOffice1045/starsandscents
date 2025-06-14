-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_id UUID REFERENCES auth.users(id),
  customer_name VARCHAR,
  customer_email VARCHAR,
  payment_status VARCHAR NOT NULL DEFAULT 'pending',
  fulfillment_status VARCHAR NOT NULL DEFAULT 'unfulfilled',
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_open BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id)
);

-- Create order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID,
  product_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  options JSONB
);

-- Create shipping addresses table
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  first_name VARCHAR,
  last_name VARCHAR,
  address_line1 VARCHAR,
  address_line2 VARCHAR,
  city VARCHAR,
  state VARCHAR,
  postal_code VARCHAR,
  country VARCHAR DEFAULT 'United States',
  phone VARCHAR
);

-- Create billing addresses table
CREATE TABLE IF NOT EXISTS public.billing_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  first_name VARCHAR,
  last_name VARCHAR,
  address_line1 VARCHAR,
  address_line2 VARCHAR,
  city VARCHAR,
  state VARCHAR,
  postal_code VARCHAR,
  country VARCHAR DEFAULT 'United States',
  phone VARCHAR
);

-- Create order history table for tracking status changes
CREATE TABLE IF NOT EXISTS public.order_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status_from VARCHAR,
  status_to VARCHAR NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Allow authenticated users to view all orders" 
  ON public.orders FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert orders" 
  ON public.orders FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update orders" 
  ON public.orders FOR UPDATE 
  TO authenticated 
  USING (true);

-- Create policies for order items
CREATE POLICY "Allow authenticated users to view all order items" 
  ON public.order_items FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert order items" 
  ON public.order_items FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update order items" 
  ON public.order_items FOR UPDATE 
  TO authenticated 
  USING (true);

-- Create policies for shipping addresses
CREATE POLICY "Allow authenticated users to view all shipping addresses" 
  ON public.shipping_addresses FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert shipping addresses" 
  ON public.shipping_addresses FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update shipping addresses" 
  ON public.shipping_addresses FOR UPDATE 
  TO authenticated 
  USING (true);

-- Create policies for billing addresses
CREATE POLICY "Allow authenticated users to view all billing addresses" 
  ON public.billing_addresses FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert billing addresses" 
  ON public.billing_addresses FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update billing addresses" 
  ON public.billing_addresses FOR UPDATE 
  TO authenticated 
  USING (true);

-- Create policies for order history
CREATE POLICY "Allow authenticated users to view all order history" 
  ON public.order_history FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert order history" 
  ON public.order_history FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create function to update order totals
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orders
  SET 
    subtotal = (
      SELECT COALESCE(SUM(total), 0)
      FROM public.order_items
      WHERE order_id = NEW.order_id
    ),
    total = (
      SELECT COALESCE(SUM(total), 0) + COALESCE(shipping, 0) + COALESCE(tax, 0) - COALESCE(discount, 0)
      FROM public.order_items
      WHERE order_id = NEW.order_id
    ),
    updated_at = NOW()
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update order totals when order items change
CREATE TRIGGER update_order_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_totals();

-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Format: #YYYY (e.g., #1001)
  NEW.order_number := '#' || (
    SELECT COALESCE(
      (SELECT MAX(SUBSTRING(order_number, 2)::integer) + 1 FROM public.orders),
      1001
    )
  )::text;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to generate order number on insert
CREATE TRIGGER generate_order_number_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION generate_order_number();