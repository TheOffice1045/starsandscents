"use client";

import { useState, useEffect } from "react";
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
  id?: string;
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
  collection_id?: string | null;
  images: ProductImage[];
}

export default function AddProductPage() {
  const [product, setProduct] = useState<Product>({
    title: "",
    description: "",
    price: 0,
    quantity: 0,
    status: "draft",
    images: [],
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [collections, setCollections] = useState<{id: string, name: string}[]>([]);
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // Fetch collections
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
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = value === "" ? null : parseFloat(value);
    setProduct(prev => ({ ...prev, [name]: numericValue }));
  };

  const handleSelectChange = (name: string, value: string | null) => {
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const addTag = () => {
    if (newTag.trim()) {
      setProduct(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setProduct(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploadingImage(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      // Upload image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Add to product images
      const newImage: ProductImage = {
        id: Math.random().toString(), // temporary ID for new images
        url: publicUrl,
        position: product.images.length,
        product_id: product.id || 'temp'
      };

      setProduct(prev => ({
        ...prev,
        images: [...prev.images, newImage]
      }));

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    // Remove from product state
    setProduct(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));

    // Note: For new products, we don't need to delete from storage
    // as these images will be properly linked when the product is created
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate product data
      const validation = validateProduct(product);
      if (!validation.valid) {
        toast.error(validation.errors[0]);
        setLoading(false);
        return;
      }

      // Create product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
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
          collection_id: product.collection_id
        })
        .select()
        .single();
      
      if (productError) throw productError;

      // Add images
      if (product.images.length > 0) {
        const formattedImages = product.images.map((image, index) => ({
          url: image.url,
          alt_text: image.alt_text,
          position: index,
          product_id: newProduct.id
        }));

        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(formattedImages);

        if (imagesError) throw imagesError;
      }
      
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
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Product
          </AdminButton>
        </div>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the basic details of your product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={product.title}
                    onChange={handleChange}
                    placeholder="Enter product title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={product.description || ""}
                    onChange={handleChange}
                    placeholder="Enter product description"
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collection">Collection</Label>
                  <Select
                    value={product.collection_id || "none"}
                    onValueChange={(value) => handleSelectChange("collection_id", value === "none" ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id}>
                          {collection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Images</Label>
                  <div className="grid grid-cols-4 gap-4">
                    {product.images.map((image) => (
                      <div key={image.id} className="relative aspect-square">
                        <Image
                          src={image.url}
                          alt={image.alt_text || "Product image"}
                          fill
                          className="object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(image.id)}
                          className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-gray-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="aspect-square flex items-center justify-center border-2 border-dashed rounded-lg">
                      <label className="cursor-pointer flex flex-col items-center justify-center">
                        <Upload className="h-6 w-6 mb-2" />
                        <span className="text-sm">Upload Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {product.tags?.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full"
                      >
                        <span className="text-sm">{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag"
                        className="w-32"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <AdminButton variant="ghost" type="button" onClick={addTag} size="sm">
                        <Plus className="h-4 w-4" />
                      </AdminButton>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pricing Information</CardTitle>
                <CardDescription>
                  Set your product&apos;s pricing details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={product.price || ""}
                    onChange={handleNumericChange}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compare_at_price">Compare at Price</Label>
                  <Input
                    id="compare_at_price"
                    name="compare_at_price"
                    type="number"
                    step="0.01"
                    value={product.compare_at_price || ""}
                    onChange={handleNumericChange}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_per_item">Cost per Item</Label>
                  <Input
                    id="cost_per_item"
                    name="cost_per_item"
                    type="number"
                    step="0.01"
                    value={product.cost_per_item || ""}
                    onChange={handleNumericChange}
                    placeholder="0.00"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Information</CardTitle>
                <CardDescription>
                  Manage your product&apos;s inventory details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={product.sku || ""}
                    onChange={handleChange}
                    placeholder="Enter SKU"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    value={product.barcode || ""}
                    onChange={handleChange}
                    placeholder="Enter barcode"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={product.quantity || 0}
                    onChange={handleNumericChange}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
                <CardDescription>
                  Set your product&apos;s shipping details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    name="weight"
                    type="number"
                    step="0.01"
                    value={product.weight || ""}
                    onChange={handleNumericChange}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight_unit">Weight Unit</Label>
                  <Select
                    value={product.weight_unit || "kg"}
                    onValueChange={(value) => handleSelectChange("weight_unit", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="lb">Pounds (lb)</SelectItem>
                      <SelectItem value="oz">Ounces (oz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SEO Information</CardTitle>
                <CardDescription>
                  Optimize your product for search engines.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seo_title">SEO Title</Label>
                  <Input
                    id="seo_title"
                    name="seo_title"
                    value={product.seo_title || ""}
                    onChange={handleChange}
                    placeholder="Enter SEO title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo_description">SEO Description</Label>
                  <Textarea
                    id="seo_description"
                    name="seo_description"
                    value={product.seo_description || ""}
                    onChange={handleChange}
                    placeholder="Enter SEO description"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}