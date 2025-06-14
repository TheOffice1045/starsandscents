-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  customer_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  total DECIMAL(10, 2) DEFAULT 0,
  notes TEXT
);

-- Set up RLS (Row Level Security)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Authenticated users can view all orders" 
  ON public.orders 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create policy for order creation
CREATE POLICY "Users can create orders" 
  ON public.orders 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create policy for order updates
CREATE POLICY "Users can update their own orders" 
  ON public.orders 
  FOR UPDATE 
  TO authenticated 
  USING (created_by = auth.uid());