-- Create function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Update product quantity, ensuring it doesn't go below 0
  UPDATE products
  SET 
    quantity = GREATEST(quantity - p_quantity, 0),
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql; 