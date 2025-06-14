"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from '@supabase/ssr';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, Share2 } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductImage } from "@/components/ui/product-image";
import { use } from "react";
import { RelatedProducts } from "@/components/related-products";
import { ProductDetailSkeleton } from "@/components/product/ProductDetailSkeleton";
import { useWishlistStore } from "@/lib/store/wishlist";
import { ProductReviews } from "@/components/product/ProductReviews";
import { useSettingsStore } from "@/lib/store/settings";

export default function ProductPage({ params }: { params: { id: string } }) {
  // Directly access the id from params
  const productId = params.id;
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  // Get settings to check if reviews are enabled
  const { settings, updateSettings } = useSettingsStore();
  
  // Add state for store settings from database
  const [storeSettings, setStoreSettings] = useState<{
    reviewsEnabled: boolean;
    starRatingsEnabled: boolean;
    starRatingsRequired: boolean;
  }>({
    reviewsEnabled: false,
    starRatingsEnabled: false,
    starRatingsRequired: false
  });
  
  // Add wishlist functionality
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore(
    (state) => ({
      addItem: state.addItem,
      removeItem: state.removeItem,
      isInWishlist: state.isInWishlist
    })
  );
  
  // Check if product is in wishlist
  const productInWishlist = product ? isInWishlist(product.id) : false;
  
  // Add state for customer ID
  const [customerId, setCustomerId] = useState<string | null>(null);
  
  // Fetch customer ID when component mounts
  useEffect(() => {
    const fetchCustomerId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('id')
          .eq('email', session.user.email)
          .single();
          
        if (customerData) {
          setCustomerId(customerData.id);
        }
      }
    };
    
    fetchCustomerId();
  }, [supabase]);
  
  // Fetch store settings directly from database
  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const { data: settings, error } = await supabase
          .from('store_settings')
          .select('reviews_enabled, star_ratings_enabled, star_ratings_required')
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching store settings:", error);
          return;
        }
        
        setStoreSettings({
          reviewsEnabled: settings?.reviews_enabled || false,
          starRatingsEnabled: settings?.star_ratings_enabled || false,
          starRatingsRequired: settings?.star_ratings_required || false
        });
      } catch (error) {
        console.error("Error in fetchStoreSettings:", error);
      }
    };
    
    fetchStoreSettings();
  }, [supabase]);
  
  // Sync wishlist with database when customer ID is available
  useEffect(() => {
    if (customerId) {
      useWishlistStore.getState().syncWithDatabase(customerId);
    }
  }, [customerId]);
  
  // Handle wishlist toggle
  const handleWishlistToggle = async () => {
    if (!product) return;
    
    if (productInWishlist) {
      await removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      await addToWishlist({
        id: product.id,
        name: product.title,
        price: product.price,
        image: product.images?.[0]?.url || '',
      });
      toast.success('Added to wishlist');
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        
        // Fetch product details
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();
        
        if (productError) throw productError;
        
        // Fetch product images
        const { data: imageData, error: imageError } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('position', { ascending: true });
          
        if (imageError) throw imageError;
        
        // Combine product with images
        setProduct({
          ...productData,
          images: imageData || []
        });
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [productId, supabase]);

  const handleAddToCart = () => {
    if (!product) return;
    
    addItem({
      id: product.id,
      name: product.title,
      price: product.price,
      image: product.images?.[0]?.url || ''
    });
    
    toast.success('Added to Cart', {
      description: `${product.title} - $${product.price.toFixed(2)}`,
      duration: 3000,
    });
  };

  // Return statement
  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="container mx-auto py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Product not found</h2>
          <p className="mt-4">The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Product Images with enhanced zoom */}
        <div className="relative aspect-square bg-gray-100 overflow-hidden group">
          {product.images && product.images.length > 0 ? (
            <div 
              className="relative w-full h-full cursor-zoom-in"
              onClick={(e) => {
                const img = e.currentTarget.querySelector('img');
                if (!img) return;
                
                // Toggle between zoomed and normal state
                if (img.classList.contains('scale-200')) {
                  img.classList.remove('scale-200');
                  img.classList.add('group-hover:scale-110');
                  e.currentTarget.classList.remove('cursor-zoom-out');
                  e.currentTarget.classList.add('cursor-zoom-in');
                } else {
                  img.classList.add('scale-200');
                  img.classList.remove('group-hover:scale-110');
                  e.currentTarget.classList.remove('cursor-zoom-in');
                  e.currentTarget.classList.add('cursor-zoom-out');
                }
              }}
            >
              <Image
                src={product.images[0].url}
                alt={product.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={90}
                onMouseMove={(e) => {
                  const container = e.currentTarget.parentElement;
                  if (!container) return;
                  
                  const { left, top, width, height } = container.getBoundingClientRect();
                  const x = (e.clientX - left) / width;
                  const y = (e.clientY - top) / height;
                  
                  // Apply transform to zoom and position the image
                  e.currentTarget.style.transformOrigin = `${x * 100}% ${y * 100}%`;
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>
      
        {/* Product Details - keep the rest of the details section unchanged */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">{product.title}</h1>
          
          <div className="flex items-center gap-4">
            <span className="text-2xl font-medium">${product.price.toFixed(2)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-gray-400 line-through text-lg">
                ${product.compare_at_price.toFixed(2)}
              </span>
            )}
          </div>
          
          <div className="prose max-w-none">
            <p>{product.description}</p>
          </div>
          
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border rounded-md">
                <button 
                  className="px-3 py-2 border-r"
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                >
                  -
                </button>
                <span className="px-4 py-2">{quantity}</span>
                <button 
                  className="px-3 py-2 border-l"
                  onClick={() => setQuantity(prev => prev + 1)}
                >
                  +
                </button>
              </div>
              <Button 
                variant="outline" 
                size="default"
                onClick={handleWishlistToggle}
                className={productInWishlist ? "text-red-500" : ""}
              >
                <Heart className={`h-6 w-6 ${productInWishlist ? "fill-red-500" : ""}`} />
              </Button>
              <Button 
                className="flex-1 bg-[#4A332F] hover:bg-[#3a2824] text-white hover:text-white"
                onClick={handleAddToCart}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
            </div>
            
            <div className="mb-6">
              <Button 
                className="w-full bg-black hover:bg-gray-800 text-white hover:text-white"
                onClick={() => {
                  handleAddToCart();
                  // Navigate to checkout page
                  window.location.href = "/checkout";
                }}
              >
                Buy Now
              </Button>
            </div>
            
            <div className="space-y-4 text-sm">
              {product.sku && (
                <div className="flex justify-left">
                  <span className="text-gray-500">SKU:</span>
                  <span>{product.sku}</span>
                </div>
              )}
              <div className="flex justify-left">
                <span className="text-gray-500">Availability:</span>
                <span>{product.quantity > 0 ? 'In stock' : 'Out of stock'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto py-12">
        {/* Product Tabs */}
        <div className="mt-16">
          <Tabs defaultValue="description">
            <TabsList className="border-b w-full justify-start">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="shipping">Shipping & Returns</TabsTrigger>
              {storeSettings.reviewsEnabled && (
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="description" className="py-6">
              <div className="prose max-w-none">
                {product.description ? (
                  <div>{product.description}</div>
                ) : (
                  <p>No description available for this product.</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="shipping" className="py-6">
              <div className="prose max-w-none">
                <h3>Shipping Information</h3>
                <p>We ship all orders within 1-2 business days.</p>
                
                <h3 className="mt-6">Return Policy</h3>
                <p>Returns accepted within 30 days of delivery.</p>
              </div>
            </TabsContent>
            {storeSettings.reviewsEnabled && (
              <TabsContent value="reviews" className="py-6">
                <ProductReviews 
                  productId={product.id}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
        
        {/* Related Products Section */}
        <div className="mt-24">
          <h2 className="text-2xl font-bold mb-8">You May Also Like</h2>
          <RelatedProducts currentProductId={product.id} collectionId={product.collection?.id} />
        </div>
      </div>
    </div>
  );
}