"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { AdminButton } from "@/components/ui/admin-button";
import  ProductForm  from "@/components/admin/ProductForm";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Collection } from "@/lib/store/collections";
import { Product } from "@/lib/types";

export default function AddProductPage() {
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    const fetchCollections = async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching collections:', error);
        toast.error('Failed to load collections');
      } else {
        setCollections(data || []);
      }
    };

    fetchCollections();
  }, [supabase]);

  const handleSubmit = async (formData: {
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
    stock: number;
  }) => {
    setLoading(true);
    
    // Add debug logging
    console.log('Form data being submitted:', formData);
    
    try {
      // Create the product data object
      const productData = {
        title: formData.name,
        description: formData.description,
        price: formData.price,
        quantity: formData.stock,
        status: 'draft',
        images: formData.imageUrl ? [{ url: formData.imageUrl, position: 0 }] : []
      };
      
      console.log('Product data being sent to Supabase:', productData);
      
      // Insert product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      if (productError) throw productError;
      
      toast.success('Product created successfully');
      router.push('/admin/products');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/admin/products" className="mr-4">
            <AdminButton variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </AdminButton>
          </Link>
          <h1 className="text-lg font-semibold">Add New Product</h1>
        </div>
        <div className="flex gap-2">
          <AdminButton 
            size="sm"
            variant="outline" 
            onClick={() => router.push('/admin/products')}
          >
            Cancel
          </AdminButton>
          <AdminButton 
            size="sm"
            onClick={() => document.querySelector('form')?.requestSubmit()}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Product
          </AdminButton>
        </div>
      </div>
      
      <ProductForm 
        onSubmit={handleSubmit} 
        isSubmitting={loading}
      />
    </div>
  );
}