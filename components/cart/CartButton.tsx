"use client";

import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { useEffect, useState } from "react";

export function CartButton() {
  const cartItems = useCartStore((state) => state.items);
  // Add this to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  // Only show cart count after component has mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const itemCount = cartItems.length;

  return (
    <div className="relative">
      <button className="flex items-center justify-center">
        <ShoppingBag className="h-6 w-6" />
      </button>
      
      {/* Only render the count badge after client-side hydration */}
      {mounted && itemCount > 0 && (
        <span
          className="absolute -top-2 -right-2 bg-primary text-white text-xs w-4 h-4 rounded-full flex items-center justify-center"
        >
          {itemCount}
        </span>
      )}
    </div>
  );
}