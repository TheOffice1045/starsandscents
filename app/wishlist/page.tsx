"use client";

import { useWishlistStore } from "@/lib/store/wishlist";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { toast } from "sonner";

export default function WishlistPage() {
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addItem);
  
  const handleAddToCart = (item: any) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image
    });
    
    toast.success('Added to cart', {
      description: `${item.name} - $${item.price.toFixed(2)}`,
      duration: 3000,
    });
  };
  
  return (
    <>
      {/* Hero Section with Breadcrumbs */}
      <div className="relative h-[150px] bg-[url('/images/breadcrumb-bg.jpg')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative container mx-auto px-4 h-full flex flex-col items-center justify-center text-white">
          <h1 className="text-3xl font-medium mb-2">Wishlist</h1>
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-[#4A332F] transition-colors">
              Home
            </Link>
            <span>›</span>
            <span>Wishlist</span>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto py-16 px-4">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-medium mb-4">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-8">Browse our products and add items to your wishlist</p>
            <Link href="/shop">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">Your Saved Items</h2>
              <Button variant="outline" onClick={clearWishlist}>Clear Wishlist</Button>
            </div>
            
            <div className="grid gap-6">
              {items.map((item) => (
                <div key={item.id} className="border rounded-md p-4 flex items-center gap-4">
                  <div className="relative h-20 w-20 flex-shrink-0">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover rounded-md"
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-100 rounded-md flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No image</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <Link href={`/products/${item.id}`} className="font-medium hover:underline">
                      {item.name}
                    </Link>
                    <div className="text-sm text-gray-500 mt-1">{formatPrice(item.price)}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAddToCart(item)}
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}