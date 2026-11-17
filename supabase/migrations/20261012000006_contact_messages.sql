-- Contact-form inbox. Messages are written by /api/contact (service role) and
-- read/managed only by store admins on /indoorme/messages.
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  replied_at timestamptz
);

CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage contact messages" ON public.contact_messages;
CREATE POLICY "Admins manage contact messages"
  ON public.contact_messages FOR ALL
  TO authenticated
  USING (public.is_store_admin())
  WITH CHECK (public.is_store_admin());
