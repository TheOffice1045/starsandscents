"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/ProductCard";
import { useState, useEffect } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { useSiteConfig } from "@/hooks/useSiteConfig";

export default function Home() {
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNewArrivals, setLoadingNewArrivals] = useState(true);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const siteConfig = useSiteConfig();

  // Fetch best sellers from the database
  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        setLoading(true);
        console.log('Fetching best sellers...');
        
        // Fetch products ordered by sales count or another metric
        const { data, error } = await supabase
          .from('products')
          .select('id, title, price, compare_at_price, quantity, status')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Products fetched:', data);
        
        // Fetch images for each product
        const productsWithImages = await Promise.all((data || []).map(async (product) => {
          const { data: imageData, error: imageError } = await supabase
            .from('product_images')
            .select('url')
            .eq('product_id', product.id)
            .order('position', { ascending: true })
            .limit(1);
            
          if (imageError) {
            console.error('Error fetching images:', imageError);
          }
            
          return {
            ...product,
            image: imageData?.[0]?.url || null
          };
        }));
        
        console.log('Products with images:', productsWithImages);
        setBestSellers(productsWithImages);
      } catch (error) {
        console.error('Error fetching best sellers:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBestSellers();
  }, [supabase]);

  // Fetch new arrivals from the database
  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        setLoadingNewArrivals(true);
        
        // Fetch newest products
        const { data, error } = await supabase
          .from('products')
          .select('id, title, price, compare_at_price, quantity, status, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(4); // Changed from 3 to 4
          
        if (error) throw error;
        
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
            image: imageData?.[0]?.url || null,
            isNew: true // Mark all products in this section as new
          };
        }));
        
        setNewArrivals(productsWithImages);
      } catch (error) {
        console.error('Error fetching new arrivals:', error);
      } finally {
        setLoadingNewArrivals(false);
      }
    };
    
    fetchNewArrivals();
  }, [supabase]);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative h-[600px] overflow-hidden group">
        <Image
          src="/images/hero-candle.jpg"
          alt="Luxury Candle Collection"
          fill
          className="object-cover transition-transform duration-1000 ease-in-out group-hover:scale-110"
          priority
        />
        <div className="absolute inset-0 bg-black/20">
          <div className="container mx-auto h-full flex items-center justify-end">
            <div className="text-white max-w-md text-left mr-16">
              <p className="text-sm uppercase tracking-[0.2em] mb-2">{siteConfig.name}</p>
              {siteConfig.description && (
                <p className="text-xs opacity-90 mb-4">{siteConfig.description}</p>
              )}
              <h1 className="text-6xl font-medium mb-8">TLC Candles</h1>
              <Link href="/shop">
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="bg-white text-[#4A332F] hover:bg-[#4A332F] hover:text-white border-[#4A332F] min-w-[160px]"
                >
                  SHOP NOW
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-medium text-center mb-12">Best Sellers</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 aspect-square rounded-md mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {bestSellers.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product}
              />
            ))}
          </div>
        )}
      </section>

      {/* Feature Section */}
      <section className="relative overflow-hidden">
        <div className="w-full h-[400px] relative">
          <Image
            src="/images/feature-background.jpg"
            style={{ objectPosition: 'center top' }}
            alt="Candles and flowers"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/70">
            <div className="container mx-auto h-full flex items-center justify-end">
              <div className="text-white max-w-md pr-8">
                <h2 className="text-4xl font-medium mb-4">Fragrances for Every Occasion</h2>
                <Link href="/shop">
                  <Button className="bg-white hover:bg-gray-100 text-black font-medium px-8">
                    SHOP NOW
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-medium text-center mb-12">New Arrivals</h2>
        {loadingNewArrivals ? (
          <div className="flex gap-8 overflow-x-auto pb-8">
            {[...Array(4)].map((_, i) => ( // Changed from 3 to 4
              <div key={i} className="animate-pulse min-w-[300px]">
                <div className="bg-gray-200 aspect-square rounded-md mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-8 overflow-x-auto pb-8">
            {newArrivals.map((product) => (
              <div key={product.id} className="min-w-[300px]">
                <ProductCard 
                  product={product}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}