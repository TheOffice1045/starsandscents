"use client";

import { useState, useEffect, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";

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
    compare_at_price: null,
    cost_per_item: null,
    sku: null,
    barcode: null,
    quantity: 0,
    weight: null,
    weight_unit: "kg",
    status: "draft",
    vendor: null,
    tags: [],
    seo_title: null,
    seo_description: null,
    collection_id: null,
    images: []
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [collections, setCollections] = useState<{id: string, name: string}[]>([]);
  const [inStock, setInStock] = useState(true);
  const [chargeTax, setChargeTax] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleStockChange = (checked: boolean) => {
    setInStock(checked);
    setProduct(prev => ({ ...prev, quantity: checked ? 1 : 0 }));
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    
    setProduct(prev => {
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
      if (!prev.tags) return prev;
      
      return {
        ...prev,
        tags: prev.tags.filter(tag => tag !== tagToRemove)
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);

    try {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload image to Supabase Storage
        const { error: uploadError, data } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        if (data) {
          const { data: publicUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(data.path);

          // Add new image to product state with proper structure
          const newImage: ProductImage = {
            id: data.path,
            url: publicUrlData.publicUrl,
            alt_text: file.name.split('.')[0], // Use filename as alt text
            position: product.images.length,
            product_id: product.id || ''
          };

          setProduct(prev => ({
            ...prev,
            images: [...prev.images, newImage]
          }));
        }
      }

      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      // For new products, the imageId is the path in storage
      const { error: deleteError } = await supabase.storage
        .from('product-images')
        .remove([imageId]);

      if (deleteError) {
        console.error("Error deleting image from storage:", deleteError);
        toast.error("Failed to delete image from storage.");
      }

      // Remove from product state
      setProduct(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== imageId)
      }));

      toast.success('Image removed.');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to remove image.');
    }
  };

  const handleSubmit = async (status: string) => {
    setLoading(true);
    
    try {
      const productData = {
        ...product,
        status,
        quantity: inStock ? product.quantity : 0,
      };

      const validation = validateProduct(productData);
      if (!validation.valid) {
        toast.error(validation.errors.join(', '));
        setLoading(false);
        return;
      }

      // 1. Create the product without images
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          title: productData.title,
          description: productData.description,
          price: productData.price,
          compare_at_price: productData.compare_at_price,
          cost_per_item: productData.cost_per_item,
          sku: productData.sku,
          barcode: productData.barcode,
          quantity: productData.quantity,
          weight: productData.weight,
          weight_unit: productData.weight_unit,
          status: productData.status,
          vendor: productData.vendor,
          tags: productData.tags,
          seo_title: productData.seo_title,
          seo_description: productData.seo_description,
          collection_id: productData.collection_id,
          taxable: chargeTax,
          track_quantity: true,
          online_store: true,
          point_of_sale: true,
        })
        .select()
        .single();
      
      if (productError) {
        console.error('Error creating product:', productError);
        toast.error(`Failed to create product: ${productError.message}`);
        setLoading(false);
        return;
      }

      // 2. If there are images, add them to the product_images table
      if (product.images.length > 0) {
        const formattedImages = product.images.map((image, index) => ({
          url: image.url,
          alt_text: image.alt_text,
          position: index,
          product_id: newProduct.id,
        }));

        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(formattedImages);

        if (imagesError) {
          console.error('Error adding product images:', imagesError);
          // Even if images fail, the product was created.
          toast.warning('Product created, but failed to add images.');
        }
      }
      
      toast.success('Product created successfully!');
      router.push('/admin/products');

    } catch (error: any) {
      console.error('An unexpected error occurred:', error);
      toast.error(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/admin/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Add Products</h1>
        </div>
        <div className="flex gap-2">
          <AdminButton 
            variant="outline" 
            onClick={() => router.push('/admin/products')}
          >
            Discard
          </AdminButton>
          <AdminButton 
            variant="outline"
            onClick={() => handleSubmit('draft')}
            disabled={loading}
          >
            Save Draft
          </AdminButton>
          <AdminButton 
            onClick={() => handleSubmit('active')}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish
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