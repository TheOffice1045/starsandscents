"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingBag, Trash2, Eye, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useCart } from "@/lib/hooks/use-cart";
import { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Image from 'next/image';

export default function WishlistTab({ user }: { user: any }) {
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { addItem } = useCart();
  
  useEffect(() => {
    async function fetchWishlist() {
      setLoading(true);
      
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (customer) {
        const { data } = await supabase
          .from('wishlist')
          .select('*, products(*, product_images(url))')
          .eq('customer_id', customer.id);
        
        if (data) {
          setWishlistItems(data);
        }
      }
      
      setLoading(false);
    }
    
    fetchWishlist();
  }, [supabase, user]);
  
  const removeFromWishlist = async (wishlistItemId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', wishlistItemId);
      
      if (error) throw error;
      
      setWishlistItems(wishlistItems.filter(item => item.id !== wishlistItemId));
      toast.success("Item removed from wishlist");
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove item from wishlist");
    }
  };
  
  const addToCart = (product: any) => {
    try {
      addItem({
        id: product.id,
        name: product.name || product.title,
        price: product.price,
        image: product.product_images?.[0]?.url,
        quantity: 1
      });
      toast.success("Added to cart");
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart");
    }
  };
  
  // Replace the current loading state with this skeleton UI
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>My Wishlist</CardTitle>
            <CardDescription>Products you&apos;ve saved for later</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={`skeleton-${item}`} className="flex items-start gap-4 p-2 border rounded-md">
                  {/* Image skeleton */}
                  <div className="w-20 h-20 bg-gray-200 rounded animate-pulse"></div>
                  
                  {/* Content skeleton */}
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mt-3"></div>
                  </div>
                  
                  {/* Actions skeleton */}
                  <div className="flex items-center border rounded-md p-1 gap-1 bg-gray-100">
                    <div className="h-7 w-7 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-7 w-7 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-7 w-7 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (wishlistItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Heart className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">Your wishlist is empty</h3>
          <p className="text-gray-500 mb-6 text-center">Save items you love to your wishlist.</p>
          <Link href="/shop">
            <Button>Browse Products</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Wishlist</CardTitle>
          <CardDescription>Products you&apos;ve saved for later</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {wishlistItems.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-2 border rounded-md">
                <div className="relative h-24 w-24">
                  <Image
                    src={item.products?.product_images?.[0]?.url || '/placeholder.png'}
                    alt={item.products?.name || 'Product'}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
                
                <div className="flex-1">
                  <Link href={`/products/${item.products.id}`}>
                    <h3 className="font-medium hover:text-primary transition-colors">
                      {item.products.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">{item.products.title}</p>
                  <div className="mt-2 font-medium">${item.products.price.toFixed(2)}</div>
                </div>
                
                <div className="flex items-center border rounded-md p-1 gap-1">
                  <TooltipProvider>
                    <TooltipRoot>
                      <TooltipTrigger asChild>
                        <Link href={`/products/${item.products.id}`} target="_blank">
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Product</p>
                      </TooltipContent>
                    </TooltipRoot>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <TooltipRoot>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon"
                          variant="ghost" 
                          className="h-7 w-7"
                          onClick={() => addToCart(item.products)}
                        >
                          <ShoppingBag className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add to Cart</p>
                      </TooltipContent>
                    </TooltipRoot>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <TooltipRoot>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon"
                          variant="ghost" 
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => removeFromWishlist(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove from Wishlist</p>
                      </TooltipContent>
                    </TooltipRoot>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}