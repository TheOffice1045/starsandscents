"use client";

import { Product } from "@/lib/types";
import Image from "next/image";
import { Button } from "../ui/button";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { QuickViewModal } from "./QuickViewModal";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProductImage } from "../ui/product-image";
import type { CartItem } from '@/lib/types/cart';
import type { WishlistItem } from '@/lib/types/wishlist';

export interface ProductCardProps {
  product: Product;
  isInWishlist?: boolean;
  onWishlistToggle?: () => void;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const addToWishlist = useWishlistStore((state) => state.addItem);
  const removeFromWishlist = useWishlistStore((state) => state.removeItem);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  
  // Check if product is in wishlist
  const inWishlist = isInWishlist(product.id);

  const handleProductClick = () => {
    router.push(`/products/${product.id}`);
  };

  // Safely access product image URL
  const imageUrl = product.images?.[0]?.url || product.image || "";
  const productName = product.title || product.name || "Product";
  const productPrice = typeof product.price === 'number' ? product.price : 0;
  
  // Handle wishlist toggle
  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (inWishlist) {
      removeFromWishlist(String(product.id));
      toast.success('Removed from wishlist');
    } else {
      const wishlistItem: WishlistItem = {
        id: String(product.id),
        name: productName,
        price: productPrice,
        image: imageUrl,
      };
      addToWishlist(wishlistItem);
      toast.success('Added to wishlist');
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cartItem: Omit<CartItem, 'quantity'> = {
      id: Number(product.id),
      name: productName,
      price: productPrice,
      image: imageUrl,
    };
    addItem(cartItem);
    toast.success('Added to Cart', {
      description: `${productName} - $${productPrice.toFixed(2)}`,
      duration: 3000,
    });
  };

  return (
    <div className="group relative cursor-pointer" onClick={handleProductClick}>
      <div className="relative aspect-square bg-gray-100 mb-4">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={productName}
            fill
            className="object-cover"
            onError={(e) => {
              // Fallback for image errors
              const target = e.target as HTMLImageElement;
              target.src = "https://placehold.co/600x400?text=No+Image";
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <span className="text-gray-400">No image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsQuickViewOpen(true);
              }}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-[#4A332F] hover:text-white transition-all translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 duration-500 ease-out"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={handleAddToCart}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-[#4A332F] hover:text-white transition-all translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 duration-300 ease-out delay-100"
            >
              <ShoppingBag className="w-5 h-5" />
            </button>
            <button 
              onClick={handleWishlistToggle}
              className={`w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-[#4A332F] hover:text-white transition-all translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 duration-300 ease-out delay-100 ${inWishlist ? 'text-red-500' : ''}`}
            >
              <Heart className={`w-5 h-5 ${inWishlist ? 'fill-red-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <h3 className="font-medium mb-1">{productName}</h3>
      <div className="flex items-center gap-2">
        <span className="text-[#4A332F]">${productPrice.toFixed(2)}</span>
        {(product.oldPrice || product.compare_at_price) && (
          <span className="text-gray-400 line-through">
            ${(product.oldPrice || product.compare_at_price || 0).toFixed(2)}
          </span>
        )}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </div>
  );
}
