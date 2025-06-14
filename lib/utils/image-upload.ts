import { createBrowserClient } from '@supabase/ssr';
import { v4 as uuidv4 } from 'uuid';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES_PER_PRODUCT = 10;

/**
 * Uploads base64 images to Supabase storage
 * @param images Array of base64 encoded images
 * @returns Array of image URLs
 */
export async function uploadProductImages(images: string[]): Promise<string[]> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const uploadedUrls: string[] = [];
  
  // Check if storage bucket exists
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'product-images');
    
    if (!bucketExists) {
      console.log('Creating product-images bucket...');
      await supabase.storage.createBucket('product-images', {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      });
    }
  } catch (error) {
    console.error('Error checking/creating bucket:', error);
  }
  
  // Limit the number of images
  const imagesToUpload = images.slice(0, MAX_IMAGES_PER_PRODUCT);
  
  for (const base64Image of imagesToUpload) {
    try {
      // Skip if image is already a URL
      if (base64Image.startsWith('http')) {
        uploadedUrls.push(base64Image);
        continue;
      }
      
      // Extract the base64 data
      const base64Data = base64Image.split(',')[1];
      if (!base64Data) {
        console.error('Invalid base64 image format');
        continue;
      }
      
      // Generate a unique filename
      const filename = `${uuidv4()}.jpg`;
      
      // Convert base64 to blob
      const blob = Buffer.from(base64Data, 'base64');
      
      // Check file size
      if (blob.length > MAX_IMAGE_SIZE) {
        console.error('Image exceeds maximum size limit');
        continue;
      }
      
      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(`products/${filename}`, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });
      
      if (error) {
        console.error('Error uploading image:', error);
        continue;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(`products/${filename}`);
      
      uploadedUrls.push(publicUrl);
    } catch (error) {
      console.error('Error processing image:', error);
    }
  }
  
  return uploadedUrls;
}