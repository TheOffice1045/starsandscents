-- Track how much of an order has been refunded. payment_status moves to
-- 'partially_refunded' / 'refunded' (set by /api/admin/orders/[id]/refund).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_refunded_amount_valid;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_refunded_amount_valid
  CHECK (refunded_amount >= 0 AND refunded_amount <= total);
