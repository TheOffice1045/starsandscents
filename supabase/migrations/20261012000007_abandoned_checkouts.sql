-- Stripe checkouts that expired without payment (written by the Stripe webhook on
-- checkout.session.expired; that event must be enabled on the webhook endpoint).
CREATE TABLE IF NOT EXISTS public.abandoned_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text NOT NULL UNIQUE,
  customer_email text,
  customer_name text,
  amount_total numeric(10, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz,
  expired_at timestamptz NOT NULL DEFAULT now(),
  contacted_at timestamptz,
  dismissed boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS abandoned_checkouts_expired_at_idx ON public.abandoned_checkouts (expired_at DESC);

ALTER TABLE public.abandoned_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage abandoned checkouts" ON public.abandoned_checkouts;
CREATE POLICY "Admins manage abandoned checkouts"
  ON public.abandoned_checkouts FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());
