-- Add phone and email to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;
