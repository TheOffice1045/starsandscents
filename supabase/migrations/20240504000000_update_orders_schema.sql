-- Add new columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_email VARCHAR,
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR,
ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS shipping_address JSONB,
ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- Add new columns to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS name VARCHAR; 