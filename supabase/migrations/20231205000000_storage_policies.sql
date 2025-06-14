-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'product-images');

-- Allow public access to view images
CREATE POLICY "Allow public viewing" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'product-images');
