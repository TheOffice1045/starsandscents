"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/ProductCard";
import { useState, useEffect } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { paragraphs } from "@/lib/site-content";

export interface FeaturedProduct {
  id: string;
  title: string;
  description: string;
  image: string | null;
}

interface HomeClientProps {
  hero: any;
  headings: any;
  feature: any;
  featured: any;
  featuredProduct: FeaturedProduct | null;
}

export default function HomeClient({ hero, headings, feature, featured, featuredProduct }: HomeClientProps) {
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
        {hero.image ? (
          <Image
            src={hero.image}
            alt={hero.title || "Luxury Candle Collection"}
            fill
            className="object-cover transition-transform duration-1000 ease-in-out group-hover:scale-110"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-[#4A332F]" />
        )}
        <div className="absolute inset-0 bg-black/20">
          <div className="container mx-auto h-full flex items-center justify-start px-4">
            <div className="text-white max-w-md text-left ml-16">
              <p className="text-sm uppercase tracking-[0.2em] mb-2">{siteConfig.name}</p>
              {siteConfig.description && (
                <p className="text-xs opacity-90 mb-4">{siteConfig.description}</p>
              )}
              {hero.title && <h1 className="text-6xl font-medium mb-8">{hero.title}</h1>}
              {hero.buttonText && (
              <Link href={hero.buttonLink || "/shop"}>
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="bg-white text-[#4A332F] hover:bg-[#4A332F] hover:text-white border-[#4A332F] min-w-[160px]"
                >
                  {hero.buttonText}
                </Button>
              </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-medium text-center mb-12">{headings.bestSellers}</h2>
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
          {feature.image ? (
            <Image
              src={feature.image}
              style={{ objectPosition: 'center top' }}
              alt={feature.heading || "Candles and flowers"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[#4A332F]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/70">
            <div className="container mx-auto h-full flex items-center justify-end">
              <div className="text-white max-w-md pr-8">
                {feature.heading && <h2 className="text-4xl font-medium mb-4">{feature.heading}</h2>}
                {paragraphs(feature.text).map((p, i) => (
                  <p key={i} className="mb-4 text-sm leading-relaxed opacity-90">{p}</p>
                ))}
                {feature.buttonText && (
                  <Link href={feature.buttonLink || "/shop"}>
                    <Button className="bg-white hover:bg-gray-100 text-black font-medium px-8">
                      {feature.buttonText}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Product Section */}
      {featuredProduct && (
        <section className="bg-neutral-50">
          <div className="container mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-md bg-gray-100">
              {(featured.image || featuredProduct.image) && (
                <Image
                  src={featured.image || featuredProduct.image!}
                  alt={featuredProduct.title}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="max-w-md">
              <h2 className="text-3xl font-medium mb-4">{featured.heading || featuredProduct.title}</h2>
              {paragraphs(featured.text || featuredProduct.description).map((p, i) => (
                <p key={i} className="mb-4 text-gray-700 leading-relaxed">{p}</p>
              ))}
              <Link href={`/products/${featuredProduct.id}`}>
                <Button className="bg-[#4A332F] hover:bg-[#3a2825] text-white font-medium px-8">
                  {featured.buttonText || "SHOP NOW"}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-medium text-center mb-12">{headings.newArrivals}</h2>
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