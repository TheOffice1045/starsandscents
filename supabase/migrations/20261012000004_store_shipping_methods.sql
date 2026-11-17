-- Shipping configuration edited in /indoorme/settings (Shipping tab) and read by
-- /api/checkout to build Stripe shipping options. See lib/shipping.ts.
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS shipping_methods JSONB;

-- The shipping option the customer chose at checkout (set by the Stripe webhook,
-- shown on the admin order and fulfillment pages).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_method TEXT;
