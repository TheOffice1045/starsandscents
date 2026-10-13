-- Set once an order's items have been put back into stock (by a full refund with
-- "return items to stock", or when an unshipped order is deleted), so stock is
-- never returned twice.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_restored boolean NOT NULL DEFAULT false;
