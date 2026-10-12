// ... existing code ...
import { createBrowserClient } from "@supabase/ssr";

// Define ProductImage interface locally
interface ProductImage {
  id: string;
  url: string;
  alt_text?: string;
  position: number;
  product_id: string;
}

// When saving product images, ensure URLs are valid
const saveProductImages = async (productId: string, images: ProductImage[]) => {
  // Filter out any images with empty URLs
  const validImages = images.filter(img => img.url && img.url.trim() !== "");
  
  // If no valid images, don't proceed
  if (validImages.length === 0) return { error: null };
  
  // Format images for database
  const formattedImages = validImages.map((image, index) => ({
    product_id: productId,
    url: image.url.trim(),
    alt_text: image.alt_text || null,
    position: index
  }));
  
  // Save to database
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return await supabase
    .from('product_images')
    .upsert(formattedImages, { onConflict: 'id' });
};

// ... existing code ...