"use client";

import { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from '@supabase/ssr';
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductSorting } from "@/components/shop/ProductSorting";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";

// Add Collection type
interface Collection {
  id: string;
  name: string;
}

// Add price range type
interface PriceRange {
  label: string;
  value: string;
  min: number | null;
  max: number | null;
}

export default function ShopPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("default");
  const [showFilters, setShowFilters] = useState(true);
  const [expandedFilters, setExpandedFilters] = useState({
    collections: true,
    price: true
  });
  
  // Add filter states
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("all");
  
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // Define price ranges
  const priceRanges = useMemo<PriceRange[]>(() => [
    { label: 'All Prices', value: 'all', min: null, max: null },
    { label: 'Under $25', value: 'under-25', min: 0, max: 25 },
    { label: '$25 - $50', value: '25-50', min: 25, max: 50 },
    { label: '$50 - $100', value: '50-100', min: 50, max: 100 },
    { label: 'Over $100', value: 'over-100', min: 100, max: null }
  ], []);

  // Fetch collections - updated to only get active collections
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('id, name')
          .eq('is_visible', true) // Only fetch visible/active collections
          .order('name');
          
        if (error) throw error;
        setCollections(data || []);
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    };
    
    fetchCollections();
  }, [supabase]);

  // Fetch products with filters
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Build the base query
        let query = supabase
          .from('products')
          .select('id, title, price, compare_at_price, quantity, status, created_at, collection_id')
          .eq('status', 'active');
        
        // Apply collection filter if any collections are selected
        if (selectedCollections.length > 0) {
          query = query.in('collection_id', selectedCollections);
        }
        
        // Apply price filter
        const selectedRange = priceRanges.find(range => range.value === selectedPriceRange);
        if (selectedRange && selectedRange.min !== null) {
          query = query.gte('price', selectedRange.min);
        }
        if (selectedRange && selectedRange.max !== null) {
          query = query.lte('price', selectedRange.max);
        }
          
        // Apply sorting
        switch (sortBy) {
          case "best-selling":
            query = query.order('quantity', { ascending: false });
            break;
          case "title-asc":
            query = query.order('title', { ascending: true });
            break;
          case "price-desc":
            query = query.order('price', { ascending: false });
            break;
          case "price-asc":
            query = query.order('price', { ascending: true });
            break;
          case "date-asc":
            query = query.order('created_at', { ascending: true });
            break;
          case "date-desc":
            query = query.order('created_at', { ascending: false });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }
        
        const { data, error } = await query;
        
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
            image: imageData?.[0]?.url || null
          };
        }));
        
        setProducts(productsWithImages);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [sortBy, selectedCollections, selectedPriceRange, supabase, priceRanges]);

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  const toggleFilterSection = (section: 'collections' | 'price') => {
    setExpandedFilters(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle collection filter change
  const handleCollectionChange = (collectionId: string) => {
    setSelectedCollections(prev => {
      if (prev.includes(collectionId)) {
        return prev.filter(id => id !== collectionId);
      } else {
        return [...prev, collectionId];
      }
    });
  };

  // Handle price range change
  const handlePriceRangeChange = (rangeId: string) => {
    setSelectedPriceRange(rangeId);
  };

  // Toggle all collections
  const handleToggleAllCollections = () => {
    if (selectedCollections.length > 0) {
      setSelectedCollections([]);
    } else {
      setSelectedCollections(collections.map(c => c.id));
    }
  };

  return (
    <>
      {/* Hero Section with Breadcrumbs */}
      <div className="relative h-[200px] bg-[url('/images/shop-hero-bg.jpg')] bg-cover bg-center bg-fixed">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative container mx-auto px-4 h-full flex flex-col items-center justify-center text-white">
          <h1 className="text-4xl font-medium mb-3 tracking-wide">Our Products</h1>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="hover:text-[#F5E6D8] transition-colors">
              Home
            </Link>
            <span>›</span>
            <span className="text-[#F5E6D8]">Products</span>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto py-12 px-4">
        {/* Sorting and filtering controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-md bg-[#4A332F] text-white hover:bg-[#3a2824] transition-colors"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>
            <p className="text-sm text-gray-600 font-medium">Showing {products.length} products</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors">
              <div className="grid grid-cols-2 gap-1">
                <div className="w-2 h-2 bg-gray-800"></div>
                <div className="w-2 h-2 bg-gray-800"></div>
                <div className="w-2 h-2 bg-gray-800"></div>
                <div className="w-2 h-2 bg-gray-800"></div>
              </div>
            </button>
            <ProductSorting onSortChange={handleSortChange} currentSort={sortBy} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Filters sidebar - now entirely collapsible */}
          {showFilters && (
            <div className="md:col-span-1 space-y-6">
              {/* Collection filter */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div 
                  className="flex justify-between items-center cursor-pointer bg-gray-50 px-5 py-4 border-b border-gray-200"
                  onClick={() => toggleFilterSection('collections')}
                >
                  <h3 className="font-medium text-[#4A332F]">Collections</h3>
                  {expandedFilters.collections ? 
                    <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  }
                </div>
                
                {expandedFilters.collections && (
                  <div className="p-5 space-y-3">
                    <div className="flex items-center">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          id="collection-all" 
                          className="peer sr-only"
                          checked={selectedCollections.length === 0 || selectedCollections.length === collections.length}
                          onChange={handleToggleAllCollections}
                        />
                        <label 
                          htmlFor="collection-all" 
                          className="w-5 h-5 border border-gray-300 rounded peer-checked:bg-[#4A332F] peer-checked:border-[#4A332F] transition-colors cursor-pointer"
                        ></label>
                        <svg 
                          className="absolute w-3 h-3 text-white left-1 top-1 pointer-events-none opacity-0 peer-checked:opacity-100" 
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <label htmlFor="collection-all" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">All Collections</label>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-2">
                      {collections.map(collection => (
                        <div key={collection.id} className="flex items-center py-1.5">
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              id={`collection-${collection.id}`} 
                              className="peer sr-only"
                              checked={selectedCollections.includes(collection.id)}
                              onChange={() => handleCollectionChange(collection.id)}
                            />
                            <label 
                              htmlFor={`collection-${collection.id}`} 
                              className="w-5 h-5 border border-gray-300 rounded peer-checked:bg-[#4A332F] peer-checked:border-[#4A332F] transition-colors cursor-pointer"
                            ></label>
                            <svg 
                              className="absolute w-3 h-3 text-white left-1 top-1 pointer-events-none opacity-0 peer-checked:opacity-100" 
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                          <label htmlFor={`collection-${collection.id}`} className="ml-2 text-sm text-gray-700 cursor-pointer">{collection.name}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Price filter */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div 
                  className="flex justify-between items-center cursor-pointer bg-gray-50 px-5 py-4 border-b border-gray-200"
                  onClick={() => toggleFilterSection('price')}
                >
                  <h3 className="font-medium text-[#4A332F]">Price</h3>
                  {expandedFilters.price ? 
                    <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  }
                </div>
                
                {expandedFilters.price && (
                  <div className="p-5 space-y-3">
                    {priceRanges.map(range => (
                      <div key={range.value} className="flex items-center py-1">
                        <div className="relative flex items-center">
                          <input 
                            type="radio" 
                            name="price" 
                            id={`price-${range.value}`} 
                            className="peer sr-only"
                            checked={selectedPriceRange === range.value}
                            onChange={() => handlePriceRangeChange(range.value)}
                          />
                          <label 
                            htmlFor={`price-${range.value}`} 
                            className="w-5 h-5 border border-gray-300 rounded-full peer-checked:border-[#4A332F] transition-colors cursor-pointer"
                          ></label>
                          <div className="absolute w-3 h-3 bg-[#4A332F] rounded-full left-1 top-1 scale-0 peer-checked:scale-100 transition-transform pointer-events-none"></div>
                        </div>
                        <label htmlFor={`price-${range.value}`} className="ml-2 text-sm text-gray-700 cursor-pointer">{range.label}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Clear filters button */}
              {(selectedCollections.length > 0 || selectedPriceRange !== "all") && (
                <button 
                  onClick={() => {
                    setSelectedCollections([]);
                    setSelectedPriceRange("all");
                  }}
                  className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
          
          {/* Products grid remains the same */}
          <div className={`${showFilters ? 'md:col-span-3' : 'md:col-span-4'}`}>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 aspect-square rounded-md mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-gray-500">No products match your filters</p>
                <button 
                  onClick={() => {
                    setSelectedCollections([]);
                    setSelectedPriceRange("all");
                  }}
                  className="mt-4 px-4 py-2 bg-[#4A332F] text-white rounded-md hover:bg-[#3a2824] transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}