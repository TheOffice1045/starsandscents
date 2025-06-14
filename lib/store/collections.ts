"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createBrowserClient } from "@supabase/ssr";

export interface Collection {
  id: string;
  name: string;
  description: string;
  productCount: number;  // This will track the number of products
  status: "Active" | "Inactive";
  slug?: string;
}

interface CollectionStore {
  collections: Collection[];
  loading: boolean;
  addCollection: (collection: Omit<Collection, "id" | "productCount">) => Promise<string | null>;
  updateCollection: (id: string, data: Partial<Collection>) => Promise<boolean>;
  deleteCollection: (id: string) => Promise<boolean>;
  toggleStatus: (id: string) => Promise<boolean>;
  updateProductCount: (id: string, count: number) => void;  // New function to update product count
  setCollections: (collections: Collection[]) => void;
  fetchCollections: () => Promise<void>;
  refreshProductCounts: () => Promise<void>;
}

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set, get) => {
      // Initialize Supabase client
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      
      return {
        collections: [],
        loading: false,
        
        setCollections: (collections) => set({ collections }),
        
        fetchCollections: async () => {
          try {
            set({ loading: true });
            const { data, error } = await supabase
              .from('collections')
              .select('*');
            
            if (error) throw error;
            
            // Map database fields to our store format
            const formattedCollections: Collection[] = data.map(collection => ({
              id: collection.id,
              name: collection.name,
              description: collection.description,
              productCount: 0, // Will be updated by refreshProductCounts
              status: collection.status === 'active' ? 'Active' : 'Inactive',
              slug: collection.slug
            }));
            
            set({ collections: formattedCollections });
            
            // Update product counts
            get().refreshProductCounts();
            
          } catch (err) {
            console.error('Error fetching collections:', err);
          } finally {
            set({ loading: false });
          }
        },
        
        refreshProductCounts: async () => {
          const { collections } = get();
          
          try {
            const updatedCollections = await Promise.all(
              collections.map(async (collection) => {
                const { count, error } = await supabase
                  .from('collection_products')
                  .select('*', { count: 'exact', head: true })
                  .eq('collection_id', collection.id);
                
                return {
                  ...collection,
                  productCount: count || 0
                };
              })
            );
            
            set({ collections: updatedCollections });
          } catch (err) {
            console.error('Error refreshing product counts:', err);
          }
        },
        
        addCollection: async (collection) => {
          try {
            const { data, error } = await supabase
              .from('collections')
              .insert({
                name: collection.name,
                description: collection.description,
                is_featured: collection.status === "Active",
                slug: collection.name.toLowerCase().replace(/\s+/g, '-')
              })
              .select();
            
            if (error) throw error;
            
            if (data && data[0]) {
              const newCollection = {
                ...collection,
                id: data[0].id,
                productCount: 0,
                slug: data[0].slug
              };
              
              set(state => ({
                collections: [...state.collections, newCollection]
              }));
              
              return data[0].id;
            }
            return null;
          } catch (err) {
            console.error('Error adding collection:', err);
            return null;
          }
        },
        
        updateCollection: async (id, data) => {
          try {
            const { error } = await supabase
              .from('collections')
              .update({
                name: data.name,
                description: data.description,
                is_featured: data.status === "Active",
                ...(data.name ? { slug: data.name.toLowerCase().replace(/\s+/g, '-') } : {})
              })
              .eq('id', id);
            
            if (error) throw error;
            
            set(state => ({
              collections: state.collections.map(c =>
                c.id === id ? { ...c, ...data } : c
              )
            }));
            
            return true;
          } catch (err) {
            console.error('Error updating collection:', err);
            return false;
          }
        },
        
        deleteCollection: async (id) => {
          try {
            // First delete all collection_products relationships
            const { error: relError } = await supabase
              .from('collection_products')
              .delete()
              .eq('collection_id', id);
            
            if (relError) throw relError;
            
            // Then delete the collection
            const { error } = await supabase
              .from('collections')
              .delete()
              .eq('id', id);
            
            if (error) throw error;
            
            set(state => ({
              collections: state.collections.filter(c => c.id !== id)
            }));
            
            return true;
          } catch (err) {
            console.error('Error deleting collection:', err);
            return false;
          }
        },
        
        toggleStatus: async (id) => {
          const collection = get().collections.find(c => c.id === id);
          if (!collection) return false;
          
          const newStatus = collection.status === "Active" ? "Inactive" : "Active";
          
          try {
            const { error } = await supabase
              .from('collections')
              .update({
                is_featured: newStatus === "Active"
              })
              .eq('id', id);
            
            if (error) throw error;
            
            set(state => ({
              collections: state.collections.map(c =>
                c.id === id ? { ...c, status: newStatus } : c
              )
            }));
            
            return true;
          } catch (err) {
            console.error('Error toggling collection status:', err);
            return false;
          }
        },
        
        updateProductCount: (id, count) => {
          set(state => ({
            collections: state.collections.map(c =>
              c.id === id ? { ...c, productCount: count } : c
            )
          }));
        }
      };
    },
    {
      name: "collections-storage",
      partialize: (state) => ({ collections: state.collections }),
    }
  )
);