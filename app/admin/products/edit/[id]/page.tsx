"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/ui/admin-button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { formatPrice, validateProduct } from "@/lib/utils";
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
  collection_id?: string | null;
  images: ProductImage[];
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [collections, setCollections] = useState<{id: string, name: string}[]>([]);
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  const productId = params.id;

  // Fetch collections and set up real-time subscription
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('id, name')
          .order('name', { ascending: true });
          
        if (error) {
          console.error('Error fetching collections:', error);
          return;
        }
        
        setCollections(data || []);
      } catch (err) {
        console.error('Error in collections fetch:', err);
      }
    };
    
    fetchCollections();
    
    // Set up real-time subscription for collections
    const collectionsChannel = supabase
      .channel('collections-changes')
      .on('postgres_changes', {
        event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'collections'
      }, async () => {
        console.log('Collections changed, refetching...');
        // Refetch all collections when any change occurs
        const { data } = await supabase
          .from('collections')
          .select('id, name')
          .order('name', { ascending: true });
          
        setCollections(data || []);
      })
      .subscribe();
      
    // Clean up subscription on component unmount
    return () => {
      supabase.removeChannel(collectionsChannel);
    };
  }, [supabase]);

  // Set up real-time subscription for product changes
  useEffect(() => {
    // Set up subscription for product changes
    const productChannel = supabase
      .channel(`product-changes-${productId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
        filter: `id=eq.${productId}`
      }, (payload) => {
        console.log('Product updated:', payload.new);
        // Update product data when changes occur
        setProduct(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            ...payload.new,
            // Preserve images as they're not included in the payload
            images: prev.images
          };
        });
      })
      .subscribe();
      
    // Set up subscription for product image changes
    const imageChannel = supabase
      .channel(`image-changes-${productId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'product_images',
        filter: `product_id=eq.${productId}`
      }, async (payload) => {
        console.log('Image added:', payload.new);
        setProduct(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            images: [...prev.images, payload.new as ProductImage]
          };
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'product_images',
        filter: `product_id=eq.${productId}`
      }, (payload) => {
        console.log('Image deleted:', payload.old);
        setProduct(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            images: prev.images.filter(img => img.id !== (payload.old as ProductImage).id)
          };
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'product_images',
        filter: `product_id=eq.${productId}`
      }, (payload) => {
        console.log('Image updated:', payload.new);
        setProduct(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            images: prev.images.map(img => 
              img.id === (payload.new as ProductImage).id ? (payload.new as ProductImage) : img
            )
          };
        });
      })
      .subscribe();
      
    // Clean up subscriptions on component unmount
    return () => {
      supabase.removeChannel(productChannel);
      supabase.removeChannel(imageChannel);
    };
  }, [productId, supabase]);

  // Fetch initial product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        
        // Fetch product details
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
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
  }, [productId, router, supabase]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setProduct(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        [name]: value
      };
    });
  };

  // Handle numeric input changes with validation
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Allow empty values (will be treated as null)
    if (value === '') {
      setProduct(prev => {
        if (!prev) return prev;
        return { ...prev, [name]: null };
      });
      return;
    }
    
    // Validate numeric input
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setProduct(prev => {
        if (!prev) return prev;
        return { ...prev, [name]: numValue };
      });
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string | null) => {
    // Wrap in requestAnimationFrame instead of setTimeout for better performance
    requestAnimationFrame(() => {
      setProduct(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          [name]: value
        };
      });
    });
  };

  // Handle tag management
  const addTag = () => {
    if (!newTag.trim()) return;
    
    setProduct(prev => {
      if (!prev) return prev;
      
      const currentTags = prev.tags || [];
      if (currentTags.includes(newTag.trim())) {
        return prev; // Tag already exists
      }
      
      return {
        ...prev,
        tags: [...currentTags, newTag.trim()]
      };
    });
    
    setNewTag("");
  };

  const removeTag = (tagToRemove: string) => {
    setProduct(prev => {
      if (!prev || !prev.tags) return prev;
      
      return {
        ...prev,
        tags: prev.tags.filter(tag => tag !== tagToRemove)
      };
    });
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !product) return;
    
    try {
      setUploadingImage(true);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        // Create a shorter filename using a timestamp instead of the original filename
        const fileName = `${product.id}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `product-images/${fileName}`;
        
        // Check file size before uploading
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast.error(`File too large: ${file.name} (max size: 5MB)`);
          continue;
        }
        
        // Upload image to storage - using 'product-images' bucket instead of 'products'
        const { error: uploadError } = await supabase
          .storage
          .from('product-images') // Changed from 'products' to 'product-images'
          .upload(filePath, file);
          
        if (uploadError) {
          console.error('Error uploading image:', JSON.stringify(uploadError));
          toast.error(`Upload failed: ${uploadError.message || 'Unknown error'}`);
          continue;
        }
        
        // Get public URL - also update bucket name here
        const { data: urlData } = supabase
          .storage
          .from('product-images') // Changed from 'products' to 'product-images'
          .getPublicUrl(filePath);
        
        // Add image to product_images table
        const position = product.images.length > 0 
          ? Math.max(...product.images.map(img => img.position)) + 1 
          : 0;
          
        const { data: imageData, error: imageError } = await supabase
          .from('product_images')
          .insert({
            product_id: product.id,
            url: urlData.publicUrl,
            alt_text: product.title,
            position
          })
          .select()
          .single();
          
        if (imageError) {
          console.error('Error saving image record:', {
            code: imageError?.code || 'no_code',
            message: imageError?.message || 'no_message',
            details: imageError?.details || 'no_details'
          });
          toast.error(`Database error: ${imageError.message || 'Failed to save image'}`);
          continue;
        }
        
        // Update local state
        setProduct(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            images: [...prev.images, imageData]
          };
        });
        
        toast.success(`Image uploaded: ${file.name}`);
      }
    } catch (err) {
      console.error('Error in image upload:', err);
      toast.error(`Upload error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle image deletion
  const handleDeleteImage = async (imageId: string) => {
    if (!product) return;
    
    try {
      // Delete image record from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);
        
      if (error) {
        console.error('Error deleting image:', error);
        toast.error("Failed to delete image");
        return;
      }
      
      // Update local state
      setProduct(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          images: prev.images.filter(img => img.id !== imageId)
        };
      });
      
      toast.success("Image deleted successfully");
    } catch (err) {
      console.error('Error in image deletion:', err);
      toast.error("An error occurred while deleting the image");
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    // Validate product data
    const validation = validateProduct(product);
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }
    
    try {
      setSaving(true);
      
      // Prepare the data to update
      const productData = {
        title: product.title,
        description: product.description,
        price: product.price,
        compare_at_price: product.compare_at_price,
        cost_per_item: product.cost_per_item,
        sku: product.sku,
        barcode: product.barcode,
        quantity: product.quantity,
        weight: product.weight,
        weight_unit: product.weight_unit,
        status: product.status,
        vendor: product.vendor,
        tags: product.tags,
        seo_title: product.seo_title,
        seo_description: product.seo_description,
        collection_id: product.collection_id,
        updated_at: new Date().toISOString() // Add updated timestamp
      };
      
      // Log the product data being sent
      console.log('Updating product with data:', productData);
      
      // Update product in database
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', product.id)
        .select();
        
      if (error) {
        console.error('Error updating product:', error);
        toast.error(`Failed to update product: ${error.message}`);
        return;
      }
      
      // Update local state with the returned data
      if (data && data.length > 0) {
        setProduct({
          ...product,
          ...data[0]
        });
      }
      
      toast.success("Product updated successfully");
      
      // Optional: Stay on the page to allow further edits
      // Comment out the next line if you want to stay on the edit page
      router.push('/admin/products');
    } catch (err) {
      console.error('Error in product update:', err);
      toast.error("An error occurred while updating the product");
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-lg font-semibold"><span className="text-gray-500">Editing</span> &quot;{product.title}&quot;</h1>
        </div>
        <div className="flex gap-2">
          <AdminButton 
            size="sm"
            variant="outline" 
            onClick={() => router.push('/admin/products')}
          >
            Cancel
          </AdminButton>
          <AdminButton size="sm"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </AdminButton>
        </div>
      </div>

      {/* Product Edit Form */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 p-1 bg-gray-100 rounded-full">
          <TabsTrigger value="general" className="rounded-full">General</TabsTrigger>
          <TabsTrigger value="images" className="rounded-full">Images</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-full">Inventory</TabsTrigger>
          <TabsTrigger value="seo" className="rounded-full">SEO</TabsTrigger>
        </TabsList>
        
        {/* General Tab */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                Basic information about your product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={product.title}
                    onChange={handleChange}
                    placeholder="Product title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={product.description}
                    onChange={handleChange}
                    placeholder="Product description"
                    rows={5}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.price}
                        onChange={handleNumericChange}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                 
                  
                  <div className="space-y-2">
                    <Label htmlFor="cost_per_item">Cost per Item</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="cost_per_item"
                        name="cost_per_item"
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.cost_per_item ?? ''}
                        onChange={handleNumericChange}
                        className="pl-8"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compare_at_price">Compare at Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="compare_at_price"
                        name="compare_at_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.compare_at_price ?? ''}
                        onChange={handleNumericChange}
                        className="pl-8"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  
                  
                  <div className="space-y-2">
                    <Label htmlFor="collection">Collection</Label>
                    <Select
                      value={product.collection_id || 'none'}
                      onValueChange={(value) => handleSelectChange('collection_id', value === 'none' ? null : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select collection" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Collection</SelectItem>
                        {collections.map(collection => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={product.status}
                      onValueChange={(value) => handleSelectChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input
                      id="vendor"
                      name="vendor"
                      value={product.vendor || ''}
                      onChange={handleChange}
                      placeholder="Vendor name (optional)"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {product.tags && product.tags.map(tag => (
                      <div key={tag} className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <AdminButton variant="outline" type="button" onClick={addTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </AdminButton>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Images Tab */}
        <TabsContent value="images" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>
                Upload and manage product images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG or WEBP (MAX. 5MB)</p>
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              </div>
              
              {uploadingImage && (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500 mr-2" />
                  <p className="text-sm text-gray-500">Uploading images...</p>
                </div>
              )}
              
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {product.images.map((image) => (
                    <div key={image.id} className="relative aspect-square rounded-md overflow-hidden border border-gray-200 group">
                      <div className="relative h-32 w-32">
                        <Image
                          src={image.url}
                          alt={image.alt_text || product.title}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(image.id)}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No images uploaded yet</p>
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
                Manage stock and inventory details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={product.sku || ''}
                    onChange={handleChange}
                    placeholder="SKU (optional)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode (ISBN, UPC, GTIN, etc.)</Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    value={product.barcode || ''}
                    onChange={handleChange}
                    placeholder="Barcode (optional)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    step="1"
                    value={product.quantity}
                    onChange={handleNumericChange}
                    placeholder="Quantity in stock"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.weight || ''}
                      onChange={handleNumericChange}
                      placeholder="Weight (optional)"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="weight_unit">Weight Unit</Label>
                    <Select
                      value={product.weight_unit || 'kg'}
                      onValueChange={(value) => handleSelectChange('weight_unit', value)}
                    >
                      <SelectTrigger id="weight_unit">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">Grams (g)</SelectItem>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="oz">Ounces (oz)</SelectItem>
                        <SelectItem value="lb">Pounds (lb)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Engine Optimization</CardTitle>
              <CardDescription>
                Improve your product&apos;s visibility in search results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title">SEO Title</Label>
                <Input
                  id="seo_title"
                  name="seo_title"
                  value={product.seo_title || ''}
                  onChange={handleChange}
                  placeholder="SEO title (defaults to product title if empty)"
                />
                <p className="text-xs text-gray-500">
                  Recommended: 50-60 characters
                </p>
              </div>
              
              {/* SEO Tab */}
              <div className="space-y-2">
                <Label htmlFor="seo_description">SEO Description</Label>
                <Textarea
                  id="seo_description"
                  name="seo_description"
                  value={product.seo_description || ''}
                  onChange={handleChange}
                  placeholder="SEO description (optional)"
                  rows={3}
                />
                <p className="text-xs text-gray-500">Recommended: 150-160 characters</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}