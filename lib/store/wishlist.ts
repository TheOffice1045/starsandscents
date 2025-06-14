import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createBrowserClient } from '@supabase/ssr';
import type { WishlistItem } from '../types/wishlist';

export interface WishlistStore {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
  isInWishlist: (id: string) => boolean;
}

interface WishlistState {
  items: WishlistItem[];
  isInitialized: boolean;
  addItem: (item: WishlistItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearWishlist: () => void;
  isInWishlist: (id: string) => boolean;
  syncWithDatabase: (customerId: string) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isInitialized: false,
      
      addItem: async (item) => {
        const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        
        // Get current session
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
              // Add to database
              await supabase.from('wishlist').upsert({
                customer_id: customerData.id,
                product_id: item.id
              }, {
                onConflict: 'customer_id, product_id'
              });
            }
          } catch (error) {
            console.error('Error adding to wishlist in database:', error);
          }
        }
        
        // Update local state
        set((state) => {
          // Check if item already exists
          if (state.items.some((i) => i.id === item.id)) {
            return state;
          }
          return { items: [...state.items, item] };
        });
      },
      
      removeItem: async (id) => {
        const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        
        // Get current session
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
              // Remove from database
              await supabase
                .from('wishlist')
                .delete()
                .match({
                  customer_id: customerData.id,
                  product_id: id
                });
            }
          } catch (error) {
            console.error('Error removing from wishlist in database:', error);
          }
        }
        
        // Update local state
        set((state) => ({
          items: state.items.filter((item) => item.id !== id)
        }));
      },
      
      clearWishlist: () => set({ items: [] }),
      
      isInWishlist: (id) => {
        return get().items.some((item) => item.id === id);
      },
      
      syncWithDatabase: async (customerId) => {
        const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        
        try {
          // Fetch wishlist items from database
          const { data: wishlistData, error: wishlistError } = await supabase
            .from('wishlist')
            .select('*')
            .eq('user_id', customerId);
            
          if (wishlistError) {
            console.error('Error fetching wishlist:', wishlistError);
            return;
          }
          
          if (wishlistData) {
            // Transform data to match WishlistItem structure
            const items: WishlistItem[] = wishlistData.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              image: item.image,
            }));
            
            // Update local state
            set({ items, isInitialized: true });
          }
        } catch (error) {
          console.error('Error syncing wishlist with database:', error);
        }
      }
    }),
    {
      name: 'wishlist-storage',
    }
  )
);