-- Create a storage bucket for product images
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('product-images', 'Product Images', true, false)
ON CONFLICT (id) DO NOTHING;

-- Set up access policies for the product images bucket

-- Policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Policy to allow public access to view product images
CREATE POLICY "Allow public to view product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy to allow authenticated users to update their own images
CREATE POLICY "Allow authenticated users to update their own product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- Policy to allow authenticated users to delete their own images
CREATE POLICY "Allow authenticated users to delete their own product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid() = owner);