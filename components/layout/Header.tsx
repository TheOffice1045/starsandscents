"use client";

import Link from "next/link";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { useEffect, useState } from "react";

export function Header() {
  // Use client-side only state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  const cartItems = useCartStore((state) => state.items);
  
  // Only show cart count after component has mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header>
      {/* Top Bar */}
      <div className="bg-gray-50 py-2 text-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex gap-4">
            <span>+1 234 567 890</span>
            <span>contact@example.com</span>
          </div>
          <div className="flex gap-4">
            <select className="bg-transparent border-none text-sm">
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
            <select className="bg-transparent border-none text-sm">
              <option>English</option>
              <option>French</option>
              <option>Spanish</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-xl font-serif italic">
            Stars & Scent
          </Link>

          {/* Navigation Links */}
          <nav className="flex gap-8">
            <Link 
              href="/" 
              className="hover:text-[#4A332F] transition-colors"
            >
              HOME
            </Link>
            <Link 
              href="/shop" 
              className="hover:text-[#4A332F] transition-colors"
            >
              SHOP
            </Link>
            <Link 
              href="/about" 
              className="hover:text-[#4A332F] transition-colors"
            >
              ABOUT
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button className="hover:text-[#4A332F] transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <Link href="/wishlist" className="hover:text-[#4A332F] transition-colors">
              <Heart className="w-5 h-5" />
            </Link>
            <Link href="/cart" className="relative hover:text-[#4A332F] transition-colors">
              <ShoppingBag className="w-5 h-5" />
              {/* Only render the cart count badge on the client side */}
              {mounted ? (
                cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#4A332F] text-white text-xs rounded-full flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )
              ) : null}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}