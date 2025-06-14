"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useNotificationStore } from './notifications';
import { createBrowserClient } from "@supabase/ssr";

// Add these missing constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES_PER_PRODUCT = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Create a proper image upload utility
async function uploadProductImages(images: string[]): Promise<string[]> {
  if (!images || !Array.isArray(images)) {
    console.warn('Invalid images array provided to uploadProductImages:', images);
    return [];
  }
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const uploadedUrls: string[] = [];
  
  // Check if storage bucket exists
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
      return [];
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'product-images');
    
    if (!bucketExists) {
      console.log('Creating product-images bucket...');
      const { error: createError } = await supabase.storage.createBucket('product-images', {
        public: true,
        fileSizeLimit: MAX_IMAGE_SIZE
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return [];
      }
    }
  } catch (error) {
    console.error('Error checking/creating bucket:', error);
    return [];
  }
  
  // Limit the number of images
  const imagesToUpload = images.slice(0, MAX_IMAGES_PER_PRODUCT);
  
  for (const img of imagesToUpload) {
    try {
      // Skip if not a base64 image or if it's already a URL
      if (!img) {
        console.warn('Empty image in array');
        continue;
      }
      
      if (img.startsWith('http')) {
        uploadedUrls.push(img); // Keep existing URLs
        continue;
      }
      
      if (!img.startsWith('data:image')) {
        console.warn('Invalid image format, not a data URL');
        continue;
      }
      
      // Extract file data and type
      const [meta, base64Data] = img.split(',');
      if (!base64Data) {
        console.warn('Invalid base64 image format');
        continue;
      }
      
      const contentType = meta.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
      const fileExt = contentType.split('/')[1] || 'jpg';
      
      // Generate unique filename
      const filename = `product_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
      
      // Convert base64 to Blob for browser environment
      const blob = await fetch(img).then(res => res.blob());
      
      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filename, blob, { contentType });
      
      if (error) {
        console.error('Upload error:', error);
        continue;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filename);
      
      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl);
      }
    } catch (err) {
      console.error('Error processing image:', err);
    }
  }
  
  return uploadedUrls;
}

// Define your store type
interface ProductStore {
  products: any[];
  loading: boolean;
  setProducts: (products: any[]) => void;
  fetchProducts: () => Promise<void>;
  addProduct: (product: any) => Promise<any>;
  updateProduct: (id: string, product: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

interface ProductData {
  title: string;
  description: string;
  price: number;
  status: string;
  quantity: number;
  images: string[];
  updated_at?: string;
}

function isValidProductData(data: unknown): data is ProductData {
  if (!data || typeof data !== 'object') return false;
  const product = data as ProductData;
  return (
    typeof product.title === 'string' &&
    typeof product.description === 'string' &&
    typeof product.price === 'number' &&
    typeof product.status === 'string' &&
    typeof product.quantity === 'number' &&
    Array.isArray(product.images) &&
    product.images.every(img => typeof img === 'string')
  );
}

interface ProductInput extends ProductData {}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      return {
        products: [],
        loading: false,
        
        setProducts: (products) => set({ products }),
        
        fetchProducts: async () => {
          try {
            set({ loading: true });
            const { data, error } = await supabase
              .from('products')
              .select('*');
            
            if (error) throw error;
            
            // Map database fields to our store format
            const formattedProducts = data.map(product => ({
              id: product.id,
              title: product.title,
              description: product.description,
              price: product.price,
              status: product.status,
              quantity: product.quantity,
              images: product.images || [],
              updated_at: product.updated_at
            }));
            
            set({ products: formattedProducts });
          } catch (err) {
            console.error('Error fetching products:', err);
          } finally {
            set({ loading: false });
          }
        },
        
        addProduct: async (product) => {
          try {
            set({ loading: true });
            
            // Inside addProduct function
            let optimizedImages = [];
            if (product.images && product.images.length > 0) {
              optimizedImages = product.images.slice(0, MAX_IMAGES_PER_PRODUCT);
              
              // Only resize if resizeImage function is available
              if (typeof resizeImage === 'function') {
                optimizedImages = await Promise.all(
                  optimizedImages.map(async (img: string) => {
                    if (img && typeof img === 'string' && img.startsWith('data:image') && img.length > MAX_IMAGE_SIZE) {
                      return await resizeImage(img, 800, 0.7);
                    }
                    return img;
                  })
                );
              }
            }
            
            // Upload images to Supabase storage
            const imageUrls = await uploadProductImages(optimizedImages);
            
            // Create product data object with only fields we know exist
            const productData = {
              title: product.title || '',
              description: product.description || '',
              price: Number(product.price) || 0,
              status: product.status || 'draft',
              quantity: Number(product.quantity) || 0,
              // Store image URLs instead of base64 data
              images: imageUrls,
              track_quantity: product.trackQuantity ?? true,
              taxable: product.taxable ?? true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            // Log the exact data being sent to Supabase
            console.log('Sending to Supabase:', JSON.stringify({
              ...productData,
              images: `${productData.images.length} images`
            }));
            
            try {
              // First check if we can access the products table
              const { count, error: countError } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true });
                
              if (countError) {
                console.error('Error accessing products table:', countError);
                throw new Error(`Cannot access products table: ${countError.message}`);
              }
              
              console.log(`Products table accessible, contains ${count} records`);
              
              // Now try the insert with minimal data
              const { data, error } = await supabase
                .from('products')
                .insert([productData])
                .select('*')
                .single();
              
              if (error) {
                // Clean up duplicate error logging
                console.error('Supabase error details:', {
                  code: error?.code || 'no_code',
                  message: error?.message || 'no_message',
                  details: error?.details || 'no_details',
                  hint: error?.hint || 'no_hint'
                });
                
                // Try a simpler insert with only essential fields
                const minimalData = {
                  title: product.title || 'Untitled Product',
                  price: Number(product.price) || 0,
                  status: 'draft'
                };
                
                console.log('Attempting minimal insert with:', minimalData);
                
                const { data: minData, error: minError } = await supabase
                  .from('products')
                  .insert([minimalData])
                  .select('*')
                  .single();
                  
                if (minError) {
                  console.error('Even minimal insert failed:', minError);
                } else if (minData) {
                  console.log('Minimal insert succeeded:', minData);
                  return minData; // Return the minimal product data
                }

                throw new Error(`Database operation failed: ${error.message} (${error.code})`);
              }
              
              if (!data) {
                throw new Error('No data returned from insert');
              }
              
              console.log('Product added successfully:', data);
              
              // Add verification step
              const { data: verifiedData, error: verifyError } = await supabase
                .from('products')
                .select('*')
                .eq('id', data.id)
                .single();
              
              if (verifyError || !verifiedData) {
                console.error('Insert verification failed:', verifyError);
                throw new Error('Product insertion could not be verified');
              }

              console.log('Verified inserted product:', verifiedData);
              
              set((state) => ({
                products: [verifiedData, ...state.products],  // Use verified data
                loading: false
              }));
              
              const { addNotification } = useNotificationStore.getState();
              addNotification({
                title: "Success",
                message: `${product.title} has been added successfully.`,
                type: "success"
              });
              
              return data;
            } catch (supabaseError) {
              console.error('Supabase operation failed:', supabaseError);
              throw supabaseError;
            }
          } catch (error) {
            const errorMessage = error instanceof Error 
              ? `${error.message}${error.cause ? ` - Cause: ${error.cause}` : ''}`
              : "Failed to add product";
            
            console.error('Error adding product:', {
              error: error instanceof Error ? error.message : String(error),
              message: errorMessage,
              productTitle: product.title
            });
            
            const { addNotification } = useNotificationStore.getState();
            addNotification({
              title: "Error",
              message: errorMessage,
              type: "error"
            });
            
            set({ loading: false });
            return null;
          }
        },

        // Rest of your code remains the same
        updateProduct: async (id, product) => {
          try {
            set({ loading: true });
            
            // Remove the nested addProduct function that's causing confusion
            
            // Convert camelCase properties to snake_case for the database
            const updateData: Partial<ProductData> = {};
            
            if (product.title !== undefined) updateData.title = product.title;
            if (product.description !== undefined) updateData.description = product.description;
            if (product.price !== undefined) updateData.price = Number(product.price);
            // Remove all fields that might not exist in your schema
            // if (product.compareAtPrice !== undefined) updateData.compare_at_price = product.compareAtPrice;
            // if (product.costPerItem !== undefined) updateData.cost_per_item = Number(product.costPerItem);
            // Remove the collection field that's causing the error
            // if (product.collectionId !== undefined) updateData.collection = product.collectionId;
            if (product.status !== undefined) updateData.status = product.status;
            // if (product.trackQuantity !== undefined) updateData.track_quantity = product.trackQuantity;
            if (product.quantity !== undefined) updateData.quantity = Number(product.quantity);
            // if (product.weight !== undefined) updateData.weight = Number(product.weight);
            // if (product.weightUnit !== undefined) updateData.weight_unit = product.weightUnit;
            // if (product.taxable !== undefined) updateData.taxable = product.taxable;
            // if (product.onlineStore !== undefined) updateData.online_store = product.onlineStore;
            // if (product.pointOfSale !== undefined) updateData.point_of_sale = product.pointOfSale;
            if (product.images !== undefined) updateData.images = product.images;
            
            // Always update the updated_at timestamp
            updateData.updated_at = new Date().toISOString();
            
            console.log('Updating product with data:', {
              ...updateData,
              images: updateData.images ? `${updateData.images.length} images` : undefined
            });
            
            const { data, error } = await supabase
              .from('products')
              .update(updateData)
              .eq('id', id)
              .select();
            
            if (error) {
              console.error('Supabase error details:', error);
              throw new Error(error.message);
            }
            
            // Update local state with the updated product data
            set((state) => ({
              products: state.products.map((p) =>
                p.id === id ? { ...p, ...product } : p
              ),
              loading: false
            }));

            const { addNotification } = useNotificationStore.getState();
            addNotification({
              title: "Success",
              message: "Product updated successfully",
              type: "success"
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to update product";
            console.error('Error updating product:', errorMessage);
            const { addNotification } = useNotificationStore.getState();
            addNotification({
              title: "Error",
              message: errorMessage,
              type: "error"
            });
            set({ loading: false });
          }
        },

        deleteProduct: async (id) => {
          try {
            const { error } = await supabase
              .from('products')
              .delete()
              .eq('id', id);

            if (error) throw error;

            set((state) => ({
              products: state.products.filter((p) => p.id !== id),
            }));

            const { addNotification } = useNotificationStore.getState();
            addNotification({
              title: "Product Deleted",
              message: "Product has been deleted successfully.",
              type: "warning"
            });
          } catch (error) {
            console.error('Error deleting product:', error);
            const { addNotification } = useNotificationStore.getState();
            addNotification({
              title: "Error",
              message: "Failed to delete product",
              type: "error"
            });
            throw error;
          }
        },
      };
    },
    {
      name: 'products-storage',
      storage: {
        getItem: (name) => {
          try {
            const value = localStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (err) {
            console.error('Error reading from localStorage:', err);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (err) {
            console.error('Error writing to localStorage:', err);
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (err) {
            console.error('Error removing from localStorage:', err);
          }
        }
      }
    }
  )
);

function resizeImage(base64: string, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (maxWidth * height) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
}

// ADD NEW IMAGE UPLOAD FUNCTION
async function handleImageUploads(images: string[]) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const uploadedUrls: string[] = [];
  
  for (const img of images) {
    if (img.startsWith('data:')) {
      try {
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(`${Date.now()}-${Math.random().toString(36).substring(7)}`, img);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(data.path);
        
        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
      }
    } else {
      uploadedUrls.push(img);
    }
  }
  
  return uploadedUrls;
}