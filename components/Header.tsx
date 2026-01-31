"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Search, Heart, ChevronDown, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      {/* Top Bar - Hidden on mobile */}
      <div className="bg-[#F6F6F8] text-sm py-2 hidden sm:block">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            {mounted && settings.email && <span>{settings.email}</span>}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 -ml-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          <Link href="/" className="flex items-center gap-2">
            {settings.logo ? (
              <div className="relative h-8 w-24 md:w-32">
                <Image
                  src={settings.logo}
                  alt={settings.name}
                  fill
                  className="object-contain"
                />
              </div>
            ) : null}
            <span className="text-base md:text-lg font-medium hidden sm:inline">{settings.name}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 mx-6">
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

          <div className="flex items-center gap-3 md:gap-4">
            {/* Add the account dropdown - hidden on mobile, shown in mobile menu */}
            {mounted && (
              <div className="hidden md:block">
                {user ? (
                  <AccountDropdown userName={getUserName()} />
                ) : (
                  <Link href="/signin" className="text-sm">
                    Sign In
                  </Link>
                )}
              </div>
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

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="container px-4 py-4 flex flex-col gap-4">
              <Link
                href="/"
                className="text-sm font-medium py-2 border-b"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/shop"
                className="text-sm font-medium py-2 border-b"
                onClick={() => setMobileMenuOpen(false)}
              >
                Shop
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium py-2 border-b"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-sm font-medium py-2 border-b"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              {mounted && (
                user ? (
                  <Link
                    href="/account"
                    className="text-sm font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Account ({getUserName()})
                  </Link>
                ) : (
                  <Link
                    href="/signin"
                    className="text-sm font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                )
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
