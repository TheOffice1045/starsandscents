-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.orders;
DROP FUNCTION IF EXISTS generate_order_number();

-- Create a new function that handles existing order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  max_num INTEGER;
  next_num INTEGER;
BEGIN
  -- Get the maximum order number, handling both formats
  SELECT COALESCE(
    (SELECT MAX(
      CASE 
        WHEN order_number LIKE 'ORD-%' THEN 
          SUBSTRING(order_number, 5)::integer
        WHEN order_number LIKE '#%' THEN 
          SUBSTRING(order_number, 2)::integer
        ELSE 0
      END
    ) FROM public.orders),
    0
  ) INTO max_num;
  
  -- Generate next number
  next_num := max_num + 1;
  
  -- Format as ORD-XXXXXX
  NEW.order_number := 'ORD-' || LPAD(next_num::text, 6, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to generate order number on insert
CREATE TRIGGER generate_order_number_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION generate_order_number(); 