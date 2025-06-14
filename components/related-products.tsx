"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { ProductCard } from "@/components/product/ProductCard";
import { useWishlistStore } from "@/lib/store/wishlist";

interface RelatedProductsProps {
  currentProductId: string;
  collectionId?: string;
}

export function RelatedProducts({ currentProductId, collectionId }: RelatedProductsProps) {
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  // Get wishlist functionality
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore(
    (state) => ({
      addItem: state.addItem,
      removeItem: state.removeItem,
      isInWishlist: state.isInWishlist
    })
  );

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from('products')
          .select('id, title, price, compare_at_price, quantity, status')
          .neq('id', currentProductId)
          .eq('status', 'active')
          .limit(4);
          
        // If we have a collection ID, prioritize products from the same collection
        if (collectionId) {
          query = query.eq('collection_id', collectionId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // If we don't have enough products from the same collection, fetch more
        if (data.length < 4 && collectionId) {
          const { data: moreData, error: moreError } = await supabase
            .from('products')
            .select('id, title, price, compare_at_price, quantity, status')
            .neq('id', currentProductId)
            .neq('collection_id', collectionId)
            .eq('status', 'active')
            .limit(4 - data.length);
            
          if (!moreError && moreData) {
            data.push(...moreData);
          }
        }
        
        // Fetch images for each product
        const productsWithImages = await Promise.all((data || []).map(async (product) => {
          const { data: imageData } = await supabase
            .from('product_images')
            .select('url')
            .eq('product_id', product.id)
            .order('position', { ascending: true })
            .limit(1);
            
          return {
            ...product,
            image: imageData?.[0]?.url || null
          };
        }));
        
        setRelatedProducts(productsWithImages);
      } catch (error) {
        console.error('Error fetching related products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRelatedProducts();
  }, [currentProductId, collectionId, supabase]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 aspect-square rounded-md mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {relatedProducts.map((product) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          isInWishlist={isInWishlist(product.id)}
          onWishlistToggle={() => {
            if (isInWishlist(product.id)) {
              removeFromWishlist(product.id);
            } else {
              addToWishlist({
                id: product.id,
                name: product.title,
                price: product.price,
                image: product.image || '',
              });
            }
          }}
        />
      ))}
    </div>
  );
}