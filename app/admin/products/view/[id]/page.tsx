"use client";

import { useState, useEffect, use, Usable } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Pencil, Tag, Package, DollarSign, Info } from "lucide-react";
import Link from "next/link";
import { formatPrice, formatDate, formatTags, formatStatus } from "@/lib/utils";
import Image from 'next/image';

interface ProductImage {
  id: string;
  url: string;
  alt_text?: string;
  position: number;
  product_id: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  compare_at_price?: number | null;
  cost_per_item?: number | null;
  sku?: string | null;
  barcode?: string | null;
  quantity: number;
  weight?: number | null;
  weight_unit?: string | null;
  status: string;
  vendor?: string | null;
  tags?: string[] | null;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at?: string;
  updated_at?: string;
  images: ProductImage[];
  collection?: { name: string; } | null;
}

export default function ViewProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  // Unwrap params using React.use()
  const unwrappedParams = use(params as unknown as Usable<unknown>) as { id: string };
  const productId = unwrappedParams.id;

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        
        // Fetch product details with collection join
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            collection:collections(id, name)
          `)
          .eq('id', productId)
          .single();
        
        if (productError) {
          toast.error("Failed to load product");
          router.push('/admin/products');
          return;
        }
        
        // Fetch product images
        const { data: imageData, error: imageError } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('position', { ascending: true });
        
        if (imageError) {
          console.error('Error fetching images:', imageError);
        }
        
        setProduct({
          ...productData,
          images: imageData || []
        });
      } catch (err) {
        console.error('Error fetching product:', err);
        toast.error("An error occurred while loading the product");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
    
    // Set up real-time subscription for product changes
    const productChannel = supabase
      .channel(`product-view-${productId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
        filter: `id=eq.${productId}`
      }, async (payload) => {
        console.log('Product updated:', payload.new);
        
        // Fetch the updated product with collection data
        const { data } = await supabase
          .from('products')
          .select(`
            *,
            collection:collections(id, name)
          `)
          .eq('id', productId)
          .single();
          
        if (data) {
          setProduct(prev => {
            if (!prev) return prev;
            return {
              ...data,
              images: prev.images
            };
          });
        }
      })
      .subscribe();
      
    // Set up subscription for product image changes
    const imageChannel = supabase
      .channel(`image-view-${productId}`)
      .on('postgres_changes', {
        event: '*', // Listen for all events
        schema: 'public',
        table: 'product_images',
        filter: `product_id=eq.${productId}`
      }, async () => {
        console.log('Images changed, refetching...');
        // Refetch all images when any change occurs
        const { data: imageData } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('position', { ascending: true });
          
        setProduct(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            images: imageData || []
          };
        });
      })
      .subscribe();
      
    // Clean up subscriptions on component unmount
    return () => {
      supabase.removeChannel(productChannel);
      supabase.removeChannel(imageChannel);
    };
  }, [productId, router, supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-medium text-gray-900">Product not found</h3>
        <div className="mt-6">
          <Link href="/admin/products">
            <Button>Back to Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = formatStatus(product.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/admin/products" className="mr-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">{product.title}</h1>
          <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/admin/products/edit/${product.id}`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Product
          </Button>
        </div>
      </div>

      {/* Product View */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>
        
        {/* General Tab */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
                <CardDescription>
                  Basic information about the product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    {product.description || "No description provided"}
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Vendor</h3>
                    <p className="text-sm text-gray-900">{product.vendor || "Not specified"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Collection</h3>
                    <p className="text-sm text-gray-900">
                      {product.collection && product.collection.name 
                        ? product.collection.name 
                        : "No collection"}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Tags</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.tags && product.tags.length > 0 ? (
                      product.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No tags</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>
                  Product pricing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500">Price</h3>
                  <p className="text-xl font-semibold text-gray-900">{formatPrice(product.price)}</p>
                </div>
                
                {product.compare_at_price && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">Compare at Price</h3>
                    <p className="text-lg text-gray-500 line-through">{formatPrice(product.compare_at_price)}</p>
                  </div>
                )}
                
                {product.cost_per_item && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">Cost per Item</h3>
                    <p className="text-sm text-gray-900">{formatPrice(product.cost_per_item)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Images Tab */}
        <TabsContent value="images" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>
                Images associated with this product
              </CardDescription>
            </CardHeader>
            <CardContent>
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {product.images.map((image) => (
                    <div key={image.id} className="relative aspect-square rounded-md overflow-hidden border border-gray-200">
                      <div className="relative h-32 w-32">
                        <Image
                          src={image.url}
                          alt={image.alt_text || product.title}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-md">
                  <p className="text-gray-500">No images available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Information</CardTitle>
              <CardDescription>
                Stock and inventory details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">SKU</h3>
                  <p className="text-sm text-gray-900">{product.sku || "Not specified"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Barcode</h3>
                  <p className="text-sm text-gray-900">{product.barcode || "Not specified"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Quantity</h3>
                  <p className="text-sm font-semibold text-gray-900">{product.quantity} in stock</p>
                </div>
                {product.weight && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Weight</h3>
                    <p className="text-sm text-gray-900">
                      {product.weight} {product.weight_unit || "kg"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO Information</CardTitle>
              <CardDescription>
                Search engine optimization details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500">SEO Title</h3>
                <p className="text-sm text-gray-900">{product.seo_title || product.title}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500">SEO Description</h3>
                <p className="text-sm text-gray-900">{product.seo_description || "No SEO description provided"}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <p className="text-sm text-gray-900">{formatDate(product.created_at)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                  <p className="text-sm text-gray-900">{formatDate(product.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}