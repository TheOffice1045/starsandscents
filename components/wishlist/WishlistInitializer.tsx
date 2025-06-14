"use client";

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useWishlistStore } from '@/lib/store/wishlist';

export function WishlistInitializer() {
  const [initialized, setInitialized] = useState(false);
  const isInitialized = useWishlistStore((state) => state.isInitialized);
  const syncWithDatabase = useWishlistStore((state) => state.syncWithDatabase);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  useEffect(() => {
    const initializeWishlist = async () => {
      if (initialized || isInitialized) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        try {
          // Get customer ID
          const { data: customerData } = await supabase
            .from('customers')
            .select('id')
            .eq('email', session.user.email)
            .single();
            
          if (customerData) {
            // Sync wishlist with database
            await syncWithDatabase(customerData.id);
          }
        } catch (error) {
          console.error('Error initializing wishlist:', error);
        }
      }
      
      setInitialized(true);
    };
    
    initializeWishlist();
  }, [supabase, initialized, isInitialized, syncWithDatabase]);
  
  return null;
}