-- Add store_slogan column to store_settings table
DO $$
BEGIN
  -- Add store_slogan column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'store_settings' 
    AND column_name = 'store_slogan'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN store_slogan TEXT;
  END IF;
END $$; 