"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/ui/admin-button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  const [chargeTax, setChargeTax] = useState(false);
  const [collections, setCollections] = useState<{id: string, name: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  }, [supabase, productId]);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // Fetch the product with its images
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (productError) {
          console.error('Error fetching product:', productError);
          toast.error(`Failed to fetch product: ${productError.message}`);
          return;
        }

        // Fetch product images separately
        const { data: imagesData, error: imagesError } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('position', { ascending: true });

        if (imagesError) {
          console.error('Error fetching images:', imagesError);
          toast.error(`Failed to fetch images: ${imagesError.message}`);
          return;
        }

        // Combine product data with images
        const product = {
          ...productData,
          images: imagesData || []
        };

        setProduct(product);
        setChargeTax(product.taxable || false);
      } catch (err) {
        console.error('Error in product fetch:', err);
        toast.error("An error occurred while fetching the product");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [supabase, productId]);

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

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProduct(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [name]: value === '' ? null : parseFloat(value)
      };
    });
  };

  const handleSelectChange = (name: string, value: string | null) => {
    setProduct(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [name]: value
      };
    });
  };

  const addTag = () => {
    if (newTag.trim() && product && (!product.tags || !product.tags.includes(newTag.trim()))) {
      setProduct(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tags: [...(prev.tags || []), newTag.trim()]
        };
      });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setProduct(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !product) return;

    setUploadingImage(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        // Save image record to database
        const { data: imageRecord, error: dbError } = await supabase
          .from('product_images')
          .insert({
            product_id: product.id,
            url: publicUrl,
            alt_text: product.title,
            position: (product.images?.length || 0) + 1
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
          throw dbError;
        }

        return imageRecord;
      });

      const newImages = await Promise.all(uploadPromises);
      
      // Update local state
      setProduct(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          images: [...(prev.images || []), ...newImages]
        };
      });

      toast.success(`${newImages.length} image(s) uploaded successfully`);
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error(`Failed to upload images: ${error.message}`);
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!product) return;

    try {
      // Find the image to delete
      const imageToDelete = product.images.find(img => img.id === imageId);
      if (!imageToDelete) return;

      // Extract file path from URL
      const urlParts = imageToDelete.url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `product-images/${fileName}`;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('product-images')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        toast.error(`Failed to delete image: ${dbError.message}`);
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
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast.error(`Failed to delete image: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    setSaving(true);
    
    try {
      // Validate product data
      const validation = validateProduct(product);
      if (!validation.valid) {
        toast.error(validation.errors[0]);
        return;
      }
      
      // Prepare product data for update
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
        taxable: chargeTax,
        updated_at: new Date().toISOString()
      };
      
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
          <h1 className="text-lg font-semibold">Edit Products</h1>
        </div>
        <div className="flex gap-2">
          <AdminButton 
            size="sm"
            variant="outline" 
            onClick={() => router.push('/admin/products')}
          >
            Discard
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
      
      <div className="grid grid-cols-[2fr,1fr] gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Product Details */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-base font-medium mb-4">Product Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={product.title}
                  onChange={handleChange}
                  placeholder="Product title"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={product.sku || ""}
                    onChange={handleChange}
                    placeholder="SKU (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode (ISBN, UPC, GTIN, etc.)</Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    value={product.barcode || ""}
                    onChange={handleChange}
                    placeholder="Barcode (optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <Label>Tags</Label>
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
                  <div className="flex flex-wrap gap-2 mt-2">
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
                </div>
              </div>

              <div>
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
            </div>
          </div>

          {/* Product Images */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium">Product Images</h2>
              <button className="text-sm text-primary hover:underline">
                Add media from URL
              </button>
            </div>
            <div className="flex items-center justify-center w-full mb-4">
              <label
                htmlFor="image-upload"
                className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-white"
              >
                <div className="text-center">
                  <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                  <p className="font-semibold text-gray-600">Drop your images here</p>
                  <p className="text-xs text-gray-500 mt-1">PNG or JPG (max. 5MB)</p>
                  <div className="mt-4">
                    <AdminButton type="button" variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Select images
                      </span>
                    </AdminButton>
                  </div>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="image/png, image/jpeg"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  ref={fileInputRef}
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
                    <Image
                      src={image.url}
                      alt={image.alt_text || product.title}
                      fill
                      className="object-cover rounded-md"
                    />
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
              !uploadingImage && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No images uploaded yet.</p>
                </div>
              )
            )}
          </div>

          {/* SEO */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-base font-medium mb-4">Search Engine Optimization</h2>
            <div className="space-y-4">
              <div>
                <Label>Page Title</Label>
                <Input
                  id="seo_title"
                  name="seo_title"
                  value={product.seo_title || ''}
                  onChange={handleChange}
                  placeholder="Enter page title"
                />
              </div>
              <div>
                <Label>Meta Description</Label>
                <Textarea
                  id="seo_description"
                  name="seo_description"
                  value={product.seo_description || ''}
                  onChange={handleChange}
                  placeholder="Enter meta description"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pricing */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-base font-medium mb-4">Pricing</h2>
            <div className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label>Charge tax on this product</Label>
                <Switch checked={chargeTax} onCheckedChange={setChargeTax} />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-base font-medium mb-4">Inventory</h2>
            <div className="space-y-4">
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
              
              <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Status */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-base font-medium mb-4">Status</h2>
            <div>
              <Label>Set the product status.</Label>
              <Select
                value={product.status}
                onValueChange={(value) => handleSelectChange("status", value)}
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
          </div>

          {/* Collection */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-base font-medium mb-4">Collection</h2>
            <div className="space-y-4">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}