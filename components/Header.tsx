"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Search, Heart, ChevronDown } from 'lucide-react';
import { CartSheet } from '@/components/cart/CartSheet';
import { useCartStore } from '@/lib/store/cart';
import { SearchInline } from '@/components/SearchInline';

import { useSettingsStore } from "@/lib/store/settings";
import { useWishlistStore } from "@/lib/store/wishlist";
import { useEffect, useState } from "react";

// Add this import at the top
import { AccountDropdown } from '@/components/user/AccountDropdown';
import { createBrowserClient } from '@supabase/ssr';

export function Header() {
  const { settings, fetchStoreSettings } = useSettingsStore();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  // Add this to handle wishlist count
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const wishlistItems = useWishlistStore((state) => state.items);
  const wishlistCount = wishlistItems.length;
  
  // Only run on client side to prevent hydration errors
  useEffect(() => {
    fetchStoreSettings();
    setMounted(true);
    
    // Get current user
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    
    getUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchStoreSettings]);

  // Get user's first name or email
  const getUserName = () => {
    if (!user) return "Guest";
    
    // Try to get name from metadata
    const firstName = user.user_metadata?.first_name;
    if (firstName) return firstName;
    
    // Fall back to email
    if (user.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    return "Account";
  };

  return (
    <>
      {/* Top Bar */}
      <div className="bg-[#F6F6F8] text-sm py-2">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            {mounted && settings.phone && <span>{settings.phone}</span>}
            {mounted && settings.email && <span>{settings.email}</span>}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {settings.logo ? (
              <div className="relative h-8 w-32">
                <Image
                  src={settings.logo}
                  alt={settings.name}
                  fill
                  className="object-contain"
                />
              </div>
            ) : null}
            <span className="text-lg font-medium">{settings.name}</span>
          </Link>

          <nav className="flex items-center gap-6 mx-6">
            <Link href="/" className="text-sm font-medium">
              Home
            </Link>
            <Link href="/shop" className="text-sm font-medium">
              Shop
            </Link>
           
            <Link href="/about" className="text-sm font-medium">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium">
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* Add the account dropdown */}
            {mounted && (
              user ? (
                <AccountDropdown userName={getUserName()} />
              ) : (
                <Link href="/signin" className="text-sm">
                 Sign In
                </Link>
              )
            )}
            
            <Link href="/account?tab=wishlist" className="relative">
              <Heart className="h-5 w-5" />
              {mounted && wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <CartSheet />
          </div>
        </div>
      </header>
    </>
  );
}
