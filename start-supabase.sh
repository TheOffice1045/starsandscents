#!/bin/bash

# Install Supabase CLI if not already installed
if ! command -v supabase &> /dev/null; then
    echo "Installing Supabase CLI..."
    brew install supabase/tap/supabase
fi

# Initialize Supabase if not already initialized
if [ ! -f "supabase/config.toml" ]; then
    echo "Initializing Supabase..."
    supabase init
fi

# Start Supabase services
echo "Starting Supabase services..."
supabase start

# Create product-images bucket if it doesn't exist
echo "Setting up storage bucket..."
supabase storage create product-images --if-not-exists

# Set up RLS policies for the bucket
echo "Setting up storage policies..."
cat << EOF > supabase/migrations/20231205000000_storage_policies.sql
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'product-images');

-- Allow public access to view images
CREATE POLICY "Allow public viewing" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'product-images');
EOF

supabase migration up

echo "Supabase is running! Access the Studio at: http://localhost:54323"