-- store_settings is publicly readable (the storefront needs it), so it must never
-- hold payment secrets. The admin Payments tab used to save the Stripe secret key
-- and PayPal client secret into store_settings.payment_methods; the form no longer
-- accepts them (see PaymentSettings.tsx). This removes any that were already saved.
--
-- IMPORTANT: if a real key was ever entered, it has been readable by anyone with
-- the public anon key. Deleting it here does not undo that — roll the Stripe
-- secret key and the PayPal client secret in their dashboards.

-- The column was never created by a migration; make it reproducible.
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS payment_methods jsonb DEFAULT '[]'::jsonb;

DO $$
BEGIN
  -- Only touch the column if it is jsonb (it may predate this migration as another type).
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'store_settings'
      AND column_name = 'payment_methods'
      AND data_type = 'jsonb'
  ) THEN
    UPDATE public.store_settings
    SET payment_methods = (
      SELECT COALESCE(
        jsonb_agg(
          CASE
            WHEN jsonb_typeof(method -> 'settings') = 'object'
              THEN jsonb_set(method, '{settings}', (method -> 'settings') - 'secretKey' - 'clientSecret')
            ELSE method
          END
        ),
        '[]'::jsonb
      )
      FROM jsonb_array_elements(payment_methods) AS method
    )
    WHERE jsonb_typeof(payment_methods) = 'array'
      AND payment_methods::text ~ '(secretKey|clientSecret)';
  ELSE
    RAISE NOTICE 'store_settings.payment_methods is not jsonb; scrub it manually.';
  END IF;
END $$;
