"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Search, MoreHorizontal, Trash2, Check, X, HelpCircle, Loader2, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPrice, formatStatus, truncateText } from "@/lib/utils";
import { AdminButton } from "@/components/ui/admin-button";
import { ProductImage } from "@/components/ui/product-image";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  compare_at_price?: number;
  cost_per_item?: number;
  sku?: string;
  barcode?: string;
  quantity: number;
  weight?: number;
  weight_unit?: string;
  status: string;
  vendor?: string;
  tags?: string[];
  seo_title?: string;
  seo_description?: string;
  created_at?: string;
  updated_at?: string;
  collection?: { id: string; name: string; };
  images: { id: string; url: string; alt_text?: string; position: number; }[];
}

interface DuplicateProduct {
  id?: string;
  created_at?: string;
  updated_at?: string;
  images?: any[];
  title?: string;
  sku?: string | null;
  // ... other properties ...
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [sortField, setSortField] = useState<string>("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  // Fetch products and set up real-time subscription
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching products:', error);
          toast.error('Failed to load products');
          return;
        }
        
        // Fetch images for each product
        const productsWithImages = await Promise.all((data || []).map(async (product) => {
          const { data: imageData, error: imageError } = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', product.id)
            .order('position', { ascending: true });
            
          const validImages = imageError ? [] : (imageData || []).filter(img => img.url && img.url.trim() !== "");
          return { ...product, images: validImages };
        }));
        
        setProducts(productsWithImages);
      } catch (err) {
        console.error('Error in fetchProducts:', err);
        toast.error('An error occurred while loading products');
      } finally {
        setLoading(false);
      }
    };
  
    fetchProducts();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('product-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setProducts(prev => [payload.new as Product, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setProducts(prev => prev.map(product => 
            product.id === payload.new.id ? {...product, ...payload.new as Product} : product
          ));
        } else if (payload.eventType === 'DELETE') {
          setProducts(prev => prev.filter(product => product.id !== payload.old.id));
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // Sorting function
  const handleSort = (field: string) => {
    setSortDirection(field === sortField ? (sortDirection === "asc" ? "desc" : "asc") : "asc");
    setSortField(field);
  };

  // Filter and sort products
  const filteredInventory = products
    .filter((item) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(searchLower) ||
        String(item.id).includes(searchLower) ||
        (item.sku && item.sku.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      
      switch(sortField) {
        case "title":
          return direction * a.title.localeCompare(b.title);
        case "price":
          return direction * (a.price - b.price);
        case "quantity":
          return direction * ((a.quantity || 0) - (b.quantity || 0));
        case "sku":
          return direction * ((a.sku || "").localeCompare(b.sku || ""));
        case "status":
          return direction * a.status.localeCompare(b.status);
        default:
          return direction * a.title.localeCompare(b.title);
      }
    });

  // Product management functions
  const handleEdit = (product: Product) => router.push(`/admin/products/edit/${product.id}`);
  
  const handleStockUpdate = async (id: string, newValue: string) => {
    const value = parseInt(newValue);
    if (isNaN(value) || value < 0) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ quantity: value })
        .eq('id', id);
        
      if (error) throw error;
      toast.success("Stock updated successfully");
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error("Failed to update stock");
    }
    setEditingId(null);
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error("Failed to delete product");
    }
  };

  // Selection functions
  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(productId => productId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedProducts(
      selectedProducts.length === filteredInventory.length 
        ? [] 
        : filteredInventory.map(p => p.id)
    );
  };

  // Bulk actions
  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete') => {
    if (selectedProducts.length === 0) {
      toast.error("No products selected");
      return;
    }
    
    try {
      setBulkActionLoading(true);
      
      if (action === 'delete') {
        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', selectedProducts);
          
        if (error) throw error;
        
        setProducts(prev => prev.filter(product => !selectedProducts.includes(product.id)));
        toast.success(`${selectedProducts.length} products deleted successfully`);
      } else {
        const newStatus = action === 'publish' ? 'active' : 'draft';
        const { error } = await supabase
          .from('products')
          .update({ status: newStatus })
          .in('id', selectedProducts);
          
        if (error) throw error;
        
        setProducts(prev => prev.map(product => 
          selectedProducts.includes(product.id) 
            ? {...product, status: newStatus} 
            : product
        ));
        
        toast.success(`${selectedProducts.length} products ${action === 'publish' ? 'published' : 'unpublished'} successfully`);
      }
      
      setSelectedProducts([]);
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      toast.error(`Failed to ${action} products`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Render sort indicator
  const SortIndicator = ({ field }: { field: string }) => (
    sortField === field && (
      sortDirection === "asc" 
        ? <ArrowUp className="ml-1 h-3 w-3" /> 
        : <ArrowDown className="ml-1 h-3 w-3" />
    )
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">All Products</h1>
        <Link href="/admin/products/add">
          <AdminButton size="sm"><Plus className="mr-2 h-4 w-4" />Add Product</AdminButton>
        </Link>
      </div>

      {/* Search and Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              {selectedProducts.length > 0 && (
                <Badge variant="outline" className="text-sm">
                  {selectedProducts.length} selected
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AdminButton 
                    variant="outline" 
                    size="sm"
                    disabled={selectedProducts.length === 0}
                  >
                    {bulkActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </AdminButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkAction('publish')}>
                    <Check className="mr-2 h-4 w-4" />
                    Publish Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('unpublish')}>
                    <X className="mr-2 h-4 w-4" />
                    Unpublish Selected
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete {selectedProducts.length} selected products.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-red-600 hover:bg-red-700 text-white hover:text-white"
                          onClick={() => handleBulkAction('delete')}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="border-0">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-10 w-10" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : filteredInventory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="pl-6 pr-2 py-3 text-left">
                      <Checkbox 
                        checked={selectedProducts.length === filteredInventory.length && filteredInventory.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all products"
                      />
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort("title")}
                    >
                      <div className="flex items-center">
                        Product
                        <SortIndicator field="title" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort("sku")}
                    >
                      <div className="flex items-center">
                        SKU
                        <SortIndicator field="sku" />
                      </div>
                    </th>
                    {/* Removing the Collections column */}
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center">
                        Price
                        <SortIndicator field="price" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort("quantity")}
                    >
                      <div className="flex items-center">
                        Stock
                        <SortIndicator field="quantity" />
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIndicator field="status" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInventory.map((product) => {
                    const statusInfo = formatStatus(product.status);
                    
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="pl-6 pr-2 py-3">
                          <Checkbox 
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                            aria-label={`Select ${product.title}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div 
                            className="flex items-center cursor-pointer" 
                            onClick={() => handleEdit(product)}
                          >
                            <div className="relative h-10 w-10 mr-3">
                              <ProductImage 
                                url={product.images?.[0]?.url} 
                                alt={product.images?.[0]?.alt_text || `Product: ${product.title}`}
                              />
                            </div>
                            <div>
                              <div className="font-medium text-[13px]">{product.title}</div>
                              {product.description && (
                                <div className="text-[11px] text-gray-500 mt-1">
                                  {truncateText(product.description, 60)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {product.sku || "-"}
                        </td>
                        {/* Removing the Collections cell */}
                        <td className="px-4 py-3 text-xs font-medium">
                          {formatPrice(product.price)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="flex items-center">
                            {editingId === product.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-16 h-7 text-xs"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleStockUpdate(product.id, editValue)}
                                >
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setEditingId(null)}
                                >
                                  <X className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="font-medium">{product.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-1 h-7 w-7 p-0"
                                  onClick={() => {
                                    setEditingId(product.id);
                                    setEditValue(product.quantity?.toString() || "0");
                                  }}
                                >
                                  <Pencil className="h-3 w-3 text-gray-400" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(product)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              
                              {product.status !== 'active' ? (
                                <DropdownMenuItem onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('products')
                                      .update({ status: 'active' })
                                      .eq('id', product.id);
                                      
                                    if (error) throw error;
                                    setProducts(prev => prev.map(p => 
                                      p.id === product.id ? {...p, status: 'active'} : p
                                    ));
                                    toast.success('Product published');
                                  } catch (error) {
                                    console.error('Error publishing product:', error);
                                    toast.error('Failed to publish product');
                                  }
                                }}>
                                  <Check className="mr-2 h-4 w-4 text-green-600" />
                                  Publish
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('products')
                                      .update({ status: 'draft' })
                                      .eq('id', product.id);
                                      
                                    if (error) throw error;
                                    setProducts(prev => prev.map(p => 
                                      p.id === product.id ? {...p, status: 'draft'} : p
                                    ));
                                    toast.success('Product unpublished');
                                  } catch (error) {
                                    console.error('Error unpublishing product:', error);
                                    toast.error('Failed to unpublish product');
                                  }
                                }}>
                                  <X className="mr-2 h-4 w-4 text-red-600" />
                                  Unpublish
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem onClick={() => {
                                const duplicateProduct: DuplicateProduct = {
                                  ...product,
                                  title: `${product.title} (Copy)`,
                                  sku: product.sku ? `${product.sku}-COPY` : null,
                                };
                                
                                delete duplicateProduct.id;
                                delete duplicateProduct.created_at;
                                delete duplicateProduct.updated_at;
                                delete duplicateProduct.images;
                                
                                supabase
                                  .from('products')
                                  .insert(duplicateProduct)
                                  .select()
                                  .then(({ data, error }) => {
                                    if (error) {
                                      toast.error(`Failed to duplicate: ${error.message}`);
                                    } else if (data && data[0]) {
                                      toast.success('Product duplicated');
                                      
                                      if (product.images && product.images.length > 0) {
                                        const newProductId = data[0].id;
                                        const imagesToInsert = product.images.map(img => ({
                                          product_id: newProductId,
                                          url: img.url,
                                          alt_text: img.alt_text,
                                          position: img.position
                                        }));
                                        
                                        supabase
                                          .from('product_images')
                                          .insert(imagesToInsert)
                                          .then(({ error: imgError }) => {
                                            if (imgError) {
                                              console.error('Error duplicating images:', imgError);
                                            }
                                          });
                                      }
                                    }
                                  });
                              }}>
                                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                                Duplicate
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => window.open(`/products/${product.id}`, '_blank')}>
                                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                Store View
                              </DropdownMenuItem>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the product.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      className="bg-red-600 hover:bg-red-700 text-white hover:text-white"
                                      onClick={() => handleDeleteProduct(product.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <HelpCircle className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchQuery ? "No products match your search criteria." : "Get started by adding your first product."}
                </p>
                <div className="mt-6">
                  <Link href="/admin/products/add">
                    <Button>Add Product</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}