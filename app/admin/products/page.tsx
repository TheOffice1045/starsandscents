"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Search, MoreHorizontal, MoreVertical, Trash2, Check, X, HelpCircle, Loader2, Plus, ArrowUp, ArrowDown, GripVertical, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { formatPrice, formatStatus, truncateText, generateSKU } from "@/lib/utils";
import { AdminButton } from "@/components/ui/admin-button";
import { ProductImage } from "@/components/ui/product-image";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fragment } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  images: { id: string; url: string; alt_text?: string; position: number; }[];
  collections?: { id: string; name: string; slug?: string; is_featured?: boolean }[];
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

function DraggableRow({ id, children, handle, ...props }: { id: string; children: React.ReactNode; handle?: (args: { listeners: any }) => React.ReactNode; [key: string]: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? '#f3f4f6' : undefined,
  };
  return (
    <tr ref={setNodeRef} style={style} {...attributes} {...props} className="bg-white">
      <td className="pl-2 pr-0 w-6 align-middle cursor-grab select-none sticky left-0 z-10" style={{ verticalAlign: 'middle', background: 'inherit' }}>
        {typeof handle === 'function' ? handle({ listeners }) : null}
      </td>
      {children}
    </tr>
  );
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
  const pathname = usePathname();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [productOrder, setProductOrder] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [collections, setCollections] = useState<{id: string, name: string}[]>([]);
  const [bulkCollectionDialogOpen, setBulkCollectionDialogOpen] = useState(false);
  const [bulkCollectionId, setBulkCollectionId] = useState<string>("");
  const [bulkPriceDialogOpen, setBulkPriceDialogOpen] = useState(false);
  const [bulkPrice, setBulkPrice] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [duplicateLoadingId, setDuplicateLoadingId] = useState<string | null>(null);
  
  // Fetch collections for category filter
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
  
  // Fetch products and set up real-time subscription
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Build filter query for count
        let countQuery = supabase
          .from('products')
          .select('*', { count: 'exact', head: true });
        if (statusFilter !== 'all') {
          countQuery = countQuery.eq('status', statusFilter);
        }
        if (priceMin) {
          countQuery = countQuery.gte('price', Number(priceMin));
        }
        if (priceMax) {
          countQuery = countQuery.lte('price', Number(priceMax));
        }
        if (stockStatusFilter !== 'all') {
          if (stockStatusFilter === 'in_stock') {
            countQuery = countQuery.gt('quantity', 0);
          } else if (stockStatusFilter === 'out_of_stock') {
            countQuery = countQuery.eq('quantity', 0);
          } else if (stockStatusFilter === 'low_stock') {
            countQuery = countQuery.lte('quantity', 10).gt('quantity', 0);
          }
        }
        if (categoryFilter !== 'all') {
          if (categoryFilter === 'uncategorized') {
            countQuery = countQuery.is('collection_id', null);
          } else {
            countQuery = countQuery.eq('collection_id', categoryFilter);
          }
        }
        const { count, error: countError } = await countQuery;
        setTotalProducts(count || 0);
        
        // Build filter query for data
        let dataQuery = supabase
          .from('products')
          .select(`
            *,
            product_images(id, url, alt_text, position)
          `)
          .order('created_at', { ascending: false });
        if (statusFilter !== 'all') {
          dataQuery = dataQuery.eq('status', statusFilter);
        }
        if (priceMin) {
          dataQuery = dataQuery.gte('price', Number(priceMin));
        }
        if (priceMax) {
          dataQuery = dataQuery.lte('price', Number(priceMax));
        }
        if (stockStatusFilter !== 'all') {
          if (stockStatusFilter === 'in_stock') {
            dataQuery = dataQuery.gt('quantity', 0);
          } else if (stockStatusFilter === 'out_of_stock') {
            dataQuery = dataQuery.eq('quantity', 0);
          } else if (stockStatusFilter === 'low_stock') {
            dataQuery = dataQuery.lte('quantity', 10).gt('quantity', 0);
          }
        }
        if (categoryFilter !== 'all') {
          if (categoryFilter === 'uncategorized') {
            dataQuery = dataQuery.is('collection_id', null);
          } else {
            dataQuery = dataQuery.eq('collection_id', categoryFilter);
          }
        }
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await dataQuery.range(from, to);
        if (error || countError) {
          console.error('Error fetching products:', error || countError);
          toast.error('Failed to load products');
          return;
        }
        
        // Fetch collections separately to avoid foreign key issues
        const { data: collectionsData } = await supabase
          .from('collections')
          .select('id, name, slug, is_featured');
        
        const collectionsMap = new Map();
        (collectionsData || []).forEach((collection: any) => {
          collectionsMap.set(collection.id, collection);
        });
        
        // Process the data to match the expected format
        let productsWithCollections = (data || []).map((product: any) => ({
          ...product,
          images: (product.product_images || []).filter((img: any) => img.url && img.url.trim() !== ""),
          collections: product.collection_id && collectionsMap.has(product.collection_id) 
            ? [collectionsMap.get(product.collection_id)] 
            : []
        }));
        
        setProducts(productsWithCollections);
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
        console.log('Real-time change:', payload.eventType, payload);
        
        if (payload.eventType === 'INSERT') {
          // Add new product to the beginning of the list
          setProducts(prev => {
            const newProduct = payload.new as Product;
            // Check if product already exists to avoid duplicates
            if (!prev.find(p => p.id === newProduct.id)) {
              return [newProduct, ...prev];
            }
            return prev;
          });
          setTotalProducts(prev => prev + 1);
        } else if (payload.eventType === 'UPDATE') {
          // Update existing product
          setProducts(prev => prev.map(product => 
            product.id === payload.new.id 
              ? { ...product, ...payload.new as Product }
              : product
          ));
        } else if (payload.eventType === 'DELETE') {
          // Remove deleted product
          setProducts(prev => prev.filter(product => product.id !== payload.old.id));
          setTotalProducts(prev => Math.max(0, prev - 1));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images' }, (payload) => {
        // Handle product image changes
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const imageData = payload.new as any;
          setProducts(prev => prev.map(product => {
            if (product.id === imageData.product_id) {
              // Update the product's images array
              const updatedImages = product.images ? [...product.images] : [];
              const existingImageIndex = updatedImages.findIndex(img => img.id === imageData.id);
              
              if (existingImageIndex >= 0) {
                updatedImages[existingImageIndex] = imageData;
              } else {
                updatedImages.push(imageData);
              }
              
              return { ...product, images: updatedImages };
            }
            return product;
          }));
        } else if (payload.eventType === 'DELETE') {
          const imageData = payload.old as any;
          setProducts(prev => prev.map(product => {
            if (product.id === imageData.product_id) {
              return {
                ...product,
                images: product.images ? product.images.filter(img => img.id !== imageData.id) : []
              };
            }
            return product;
          }));
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });
    
    return () => { 
      console.log('Cleaning up subscription');
      supabase.removeChannel(channel); 
    };
  }, [currentPage, pageSize, statusFilter, priceMin, priceMax, stockStatusFilter, categoryFilter, supabase]);

  useEffect(() => {
    if (products.length > 0) {
      setProductOrder(products.map((p) => p.id));
    }
  }, [products]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setProductOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Sorting function
  const handleSort = (field: string) => {
    setSortDirection(field === sortField ? (sortDirection === "asc" ? "desc" : "asc") : "asc");
    setSortField(field);
    // After sorting, update productOrder to match the new filteredInventory order
    setProductOrder(filteredInventory
      .slice() // clone to avoid mutating original
      .sort((a, b) => {
        const direction = field === sortField && sortDirection === "asc" ? -1 : 1;
        switch(field) {
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
      })
      .map(p => p.id)
    );
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
      
      // Fallback state update in case real-time subscription doesn't work
      setProducts(prev => prev.map(product => 
        product.id === id ? { ...product, quantity: value } : product
      ));
      
      setEditingId(null);
      setEditValue("");
      toast.success("Stock updated successfully");
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error("Failed to update stock");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Fallback state update in case real-time subscription doesn't work
      setProducts(prev => prev.filter(product => product.id !== id));
      setTotalProducts(prev => Math.max(0, prev - 1));
      
      toast.success("Product deleted successfully");
      
      // Clear any selections if the deleted product was selected
      setSelectedProducts(prev => prev.filter(productId => productId !== id));
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
        
        // Fallback state update in case real-time subscription doesn't work
        setProducts(prev => prev.filter(product => !selectedProducts.includes(product.id)));
        setTotalProducts(prev => Math.max(0, prev - selectedProducts.length));
        
        toast.success(`${selectedProducts.length} products deleted successfully`);
      } else {
        const newStatus = action === 'publish' ? 'active' : 'draft';
        const { error } = await supabase
          .from('products')
          .update({ status: newStatus })
          .in('id', selectedProducts);
          
        if (error) throw error;
        
        // Fallback state update in case real-time subscription doesn't work
        setProducts(prev => prev.map(product => 
          selectedProducts.includes(product.id) 
            ? { ...product, status: newStatus } 
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

  // Close dialogs on route change
  useEffect(() => {
    setBulkCollectionDialogOpen(false);
    setBulkPriceDialogOpen(false);
  }, [pathname]);

  // Bulk apply collection handler
  const handleBulkApplyCollection = async () => {
    if (!bulkCollectionId || selectedProducts.length === 0) return;
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ collection_id: bulkCollectionId })
        .in('id', selectedProducts);
      if (error) throw error;
      toast.success(`Collection applied to ${selectedProducts.length} products`);
      setSelectedProducts([]);
      setBulkCollectionDialogOpen(false);
      setBulkCollectionId("");
      setBulkPriceDialogOpen(false); // ensure all dialogs close
      router.refresh?.();
    } catch (error) {
      toast.error('Failed to apply collection');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk apply price handler
  const handleBulkApplyPrice = async () => {
    if (!bulkPrice || selectedProducts.length === 0) return;
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ price: Number(bulkPrice) })
        .in('id', selectedProducts);
      if (error) throw error;
      toast.success(`Price applied to ${selectedProducts.length} products`);
      setSelectedProducts([]);
      setBulkPriceDialogOpen(false);
      setBulkPrice("");
      setBulkCollectionDialogOpen(false); // ensure all dialogs close
      router.refresh?.();
    } catch (error) {
      toast.error('Failed to apply price');
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

  const openDeleteDialog = (productId: string) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const openBulkDeleteDialog = () => {
    setBulkDeleteDialogOpen(true);
  };

  const closeBulkDeleteDialog = () => {
    setBulkDeleteDialogOpen(false);
  };

  const confirmDeleteProduct = async () => {
    if (productToDelete) {
      await handleDeleteProduct(productToDelete);
      closeDeleteDialog();
    }
  };

  const confirmBulkDelete = async () => {
    await handleBulkAction('delete');
    closeBulkDeleteDialog();
  };

  // Duplicate product handler
  const handleDuplicateProduct = async (product: Product) => {
    if (duplicateLoadingId) return;
    setDuplicateLoadingId(product.id);
    console.log('[Duplicate] Starting duplication for product:', product);
    try {
      const duplicateProduct: DuplicateProduct = {
        ...product,
        title: `${product.title} (Copy)`,
        sku: generateSKU(product.title),
      };
      delete duplicateProduct.id;
      delete duplicateProduct.created_at;
      delete duplicateProduct.updated_at;
      delete duplicateProduct.images;
      delete (duplicateProduct as any).collections;
      delete (duplicateProduct as any).product_images;

      const { data, error } = await supabase
        .from('products')
        .insert(duplicateProduct)
        .select();
      console.log('[Duplicate] Supabase insert response:', { data, error, duplicateProduct });
      if (error) {
        toast.error(`Failed to duplicate: ${error.message}`);
        return;
      }
      if (data && data[0]) {
        toast.success('Product duplicated');
        setProducts(prev => [data[0], ...prev]);
        // Duplicate images if present
        if (product.images && product.images.length > 0) {
          const newProductId = data[0].id;
          const imagesToInsert = product.images.map(img => ({
            product_id: newProductId,
            url: img.url,
            alt_text: img.alt_text,
            position: img.position
          }));
          const { error: imgError } = await supabase
            .from('product_images')
            .insert(imagesToInsert);
          if (imgError) {
            toast.error('Product duplicated, but images failed to copy.');
            console.error('[Duplicate] Error duplicating images:', imgError);
          } else {
            console.log('[Duplicate] Images duplicated successfully');
            // Fetch the images for the new product and update in state
            const { data: newImages, error: fetchImgError } = await supabase
              .from('product_images')
              .select('*')
              .eq('product_id', newProductId);
            if (!fetchImgError && newImages) {
              setProducts(prev =>
                prev.map(p =>
                  p.id === newProductId ? { ...p, images: newImages } : p
                )
              );
            }
          }
        }
        // Copy over collections/category if present
        if (product.collections && product.collections.length > 0) {
          setProducts(prev =>
            prev.map(p =>
              p.id === data[0].id ? { ...p, collections: product.collections } : p
            )
          );
        }
      } else {
        toast.error('No data returned from duplication. Check required fields and permissions.');
        console.error('[Duplicate] No data returned from duplication:', { data, error, duplicateProduct });
      }
    } catch (error: any) {
      toast.error(`Failed to duplicate: ${error.message || error}`);
      console.error('[Duplicate] Caught error:', error);
    } finally {
      setDuplicateLoadingId(null);
      console.log('[Duplicate] Duplication process finished');
    }
  };

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
                className="pl-10 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {selectedProducts.length > 0 && (
              <AdminButton
                variant="count"
                size="sm"
              >
                {selectedProducts.length} selected
              </AdminButton>
            )}
            
            {/* Filters */}
            <div className="flex gap-2 items-center">
              {/* Status Filter */}
              <select
                className="border rounded px-2 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
              {/* Stock Status Filter */}
              <select
                className="border rounded px-2 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={stockStatusFilter}
                onChange={e => setStockStatusFilter(e.target.value)}
              >
                <option value="all">All Stock Status</option>
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="low_stock">Low Stock</option>
              </select>
              {/* Collection Filter */}
              <select
                className="border rounded px-2 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Collections</option>
                <option value="uncategorized">Uncategorized</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AdminButton
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 py-2 rounded-md font-normal"
                  >
                    Price Range
                  </AdminButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="p-2 space-y-2 w-[200px]">
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Min Price"
                      className="w-full text-sm h-9"
                      value={priceMin}
                      onChange={e => setPriceMin(e.target.value)}
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Max Price"
                      className="w-full text-sm h-9"
                      value={priceMax}
                      onChange={e => setPriceMax(e.target.value)}
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AdminButton 
                    variant="ghost" 
                    size="sm"
                  >
                    {bulkActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </AdminButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {selectedProducts.length === 0 ? (
                    <DropdownMenuItem disabled className="text-gray-500 cursor-not-allowed">
                      <Info className="mr-2 h-4 w-4" />
                      Please select products to perform bulk actions
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => handleBulkAction('publish')}>
                        <Check className="mr-2 h-4 w-4" />
                        Publish Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('unpublish')}>
                        <X className="mr-2 h-4 w-4" />
                        Unpublish Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBulkCollectionDialogOpen(true)}>
                        <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="5" y="5" rx="2" ry="2" /><path d="M19 5v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5" /></svg>
                        Bulk Apply Collection
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBulkPriceDialogOpen(true)}>
                        <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="7" rx="2"/><path d="M16 11V7a4 4 0 0 0-8 0v4"/></svg>
                        Bulk Apply Price
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={openBulkDeleteDialog}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Apply Collection Dialog (triggered from dropdown) */}
      <Dialog open={bulkCollectionDialogOpen} onOpenChange={setBulkCollectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Apply Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <select
              className="select-black-focus border rounded px-2 h-9 w-full text-sm"
              value={bulkCollectionId}
              onChange={e => setBulkCollectionId(e.target.value)}
            >
              <option value="">Select a collection</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>{collection.name}</option>
              ))}
            </select>
            <AdminButton
              onClick={handleBulkApplyCollection}
              disabled={!bulkCollectionId || bulkActionLoading}
              className="w-full"
            >
              {bulkActionLoading ? 'Applying...' : 'Apply'}
            </AdminButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Apply Price Dialog (triggered from dropdown) */}
      <Dialog open={bulkPriceDialogOpen} onOpenChange={setBulkPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Apply Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="number"
              min="0"
              step="0.01"
              className="select-black-focus border rounded px-2 h-9 w-full text-sm"
              placeholder="Enter new price"
              value={bulkPrice}
              onChange={e => setBulkPrice(e.target.value)}
            />
            <AdminButton
              onClick={handleBulkApplyPrice}
              disabled={!bulkPrice || bulkActionLoading}
              className="w-full"
            >
              {bulkActionLoading ? 'Applying...' : 'Apply'}
            </AdminButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Product Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AdminButton variant="outline" onClick={closeDeleteDialog}>
              Cancel
            </AdminButton>
            <AdminButton variant="destructive" onClick={confirmDeleteProduct}>
              Delete
            </AdminButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedProducts.length} selected products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AdminButton variant="outline" onClick={closeBulkDeleteDialog}>
              Cancel
            </AdminButton>
            <AdminButton variant="destructive" onClick={confirmBulkDelete}>
              Delete
            </AdminButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Products Table */}
      <Card className="border-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            {loading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4">
                    {/* Drag handle skeleton */}
                    <Skeleton className="h-4 w-4 rounded" />
                    {/* Checkbox skeleton */}
                    <Skeleton className="h-4 w-4" />
                    {/* Product column: image + title */}
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="h-10 w-10" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" style={{ fontSize: 14 }} />
                      </div>
                    </div>
                    {/* Description column skeleton */}
                    <Skeleton className="h-4 w-24" style={{ fontSize: 14 }} />
                    {/* SKU column skeleton */}
                    <Skeleton className="h-4 w-16" style={{ fontSize: 14 }} />
                    {/* Price column skeleton */}
                    <Skeleton className="h-4 w-20" style={{ fontSize: 14 }} />
                    {/* Stock column skeleton */}
                    <Skeleton className="h-4 w-16" style={{ fontSize: 14 }} />
                    {/* Status column skeleton (badge) */}
                    <Skeleton className="h-6 w-16 rounded-lg" />
                    {/* Actions column skeleton */}
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </div>
            ) : filteredInventory.length > 0 ? (
              <div className="overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={productOrder}
                    strategy={verticalListSortingStrategy}
                  >
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="w-6 cursor-grab select-none sticky left-0 z-20 bg-gray-50"></th>
                          <th scope="col" className="w-12 px-2 align-middle sticky left-6 z-20 bg-gray-50">
                            <Checkbox
                              checked={!loading && products.length > 0 && selectedProducts.length === products.length}
                              onCheckedChange={toggleSelectAll}
                            />
                          </th>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 sticky left-[4.5rem] z-10 bg-gray-50">
                            <div onClick={() => handleSort('title')} className="flex items-center cursor-pointer">
                              Product
                              <SortIndicator field="title" />
                            </div>
                          </th>
                          <th scope="col" className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap sticky left-[14.5rem] z-10 bg-gray-50">
                            Description
                          </th>
                          <th scope="col" className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap sticky left-[24.5rem] z-10 bg-gray-50">
                            <div onClick={() => handleSort('sku')} className="flex items-center cursor-pointer">
                              SKU
                              <SortIndicator field="sku" />
                            </div>
                          </th>
                          <th scope="col" className="px-10 py-3 text-right align-middle text-sm font-medium whitespace-nowrap sticky left-[34.5rem] z-10 bg-gray-50">
                            <div onClick={() => handleSort('price')} className="flex items-center cursor-pointer">
                              Price
                              <SortIndicator field="price" />
                            </div>
                          </th>
                          <th scope="col" className="px-10 py-3 text-right align-middle text-sm font-medium whitespace-nowrap sticky left-[44.5rem] z-10 bg-gray-50">
                            <div onClick={() => handleSort('quantity')} className="flex items-center cursor-pointer">
                              Stock
                              <SortIndicator field="quantity" />
                            </div>
                          </th>
                          <th scope="col" className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap sticky left-[54.5rem] z-10 bg-gray-50">
                            <div onClick={() => handleSort('status')} className="flex items-center cursor-pointer">
                              Status
                              <SortIndicator field="status" />
                            </div>
                          </th>
                          <th scope="col" className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap sticky left-[64.5rem] z-10 bg-gray-50">Stock Status</th>
                          <th scope="col" className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap sticky left-[74.5rem] z-10 bg-gray-50">Collection</th>
                          <th scope="col" className="px-10 py-3 text-right align-middle text-sm font-medium whitespace-nowrap sticky left-[84.5rem] z-10 bg-gray-50">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {productOrder.map((id) => {
                          const product = filteredInventory.find((p) => p.id === id);
                          if (!product) return null;
                          const statusInfo = formatStatus(product.status);
                          const stockStatus = (product.quantity ?? 0) < 5 ? 'Low' : 'In Stock';
                          return (
                            <DraggableRow 
                              key={product.id} 
                              id={product.id}
                              handle={({ listeners }) => <GripVertical {...listeners} className="h-5 w-5 text-gray-400" />}
                            >
                              <td className="w-12 px-2 align-middle sticky left-6 bg-inherit z-10">
                                <Checkbox
                                  checked={selectedProducts.includes(product.id)}
                                  onCheckedChange={() => toggleProductSelection(product.id)}
                                  aria-label="Select product"
                                />
                              </td>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 sticky left-[4.5rem] bg-inherit z-10">
                                <div className="flex items-center">
                                  <div className="h-16 w-16 flex-shrink-0">
                                    <ProductImage 
                                      url={product.images && product.images.length > 0 ? product.images[0].url : '/placeholder.png'} 
                                      alt={product.title} 
                                      className="rounded-md object-cover"
                                    />
                                  </div>
                                  <div className="ml-4 max-w-xs">
                                    <Link href={`/admin/products/edit/${product.id}`} className="font-medium text-gray-900 hover:text-gray-600 break-words">
                                      {truncateText(product.title, 60)}
                                    </Link>
                                  </div>
                                </div>
                              </td>
                              <td className="px-10 py-3 text-[14px] font-normal align-middle whitespace-nowrap text-left" style={{ color: '#595959' }}>
                                {product.description ? truncateText(product.description, 25) : "-"}
                              </td>
                              <td className="px-10 py-3 text-[14px] font-normal whitespace-nowrap text-left" style={{ color: '#030712' }}>
                                {product.sku || "-"}
                              </td>
                              <td className="px-10 py-3 text-[14px] font-normal whitespace-nowrap text-right" style={{ color: '#030712' }}>
                                {formatPrice(product.price)}
                              </td>
                              <td className="px-10 py-3 text-[14px] font-normal whitespace-nowrap text-right" style={{ color: '#030712' }}>
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
                              <td className="px-10 py-3">
                                <Badge className={statusInfo.color + ' rounded-lg pointer-events-none font-normal border'}
                                  style={{
                                    cursor: 'default',
                                    borderColor:
                                      statusInfo.color.includes('green') ? 'rgba(21, 128, 61, 0.2)' : // green-700
                                      statusInfo.color.includes('red') ? 'rgba(185, 28, 28, 0.2)' :   // red-700
                                      statusInfo.color.includes('yellow') ? 'rgba(161, 98, 7, 0.2)' : // yellow-700
                                      statusInfo.color.includes('blue') ? 'rgba(30, 64, 175, 0.2)' :   // blue-700
                                      statusInfo.color.includes('gray') ? 'rgba(55, 65, 81, 0.08)' :   // gray-700, even lighter
                                      'rgba(209, 213, 219, 0.2)', // fallback gray-300
                                    borderWidth: 1,
                                    borderStyle: 'solid',
                                    opacity: 1
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = e.currentTarget.style.borderColor; e.currentTarget.style.opacity = '1'; }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = e.currentTarget.style.borderColor; e.currentTarget.style.opacity = '1'; }}
                                  data-border-opacity="0.2"
                                >
                                  {statusInfo.label}
                                </Badge>
                              </td>
                              <td className="px-10 py-3 text-[14px] font-normal whitespace-nowrap align-middle text-left" style={{ color: stockStatus === 'Low' ? '#b91c1c' : '#15803d' }}>
                                {stockStatus}
                              </td>
                              <td className="px-10 py-3 text-[14px] font-normal whitespace-nowrap text-left" style={{ color: '#030712' }}>
                                {(product.collections ?? []).length > 0 ? (
                                  <div className="flex gap-1 items-center">
                                    {(product.collections ?? []).map((c: any, index: number) => (
                                      <Fragment key={c.id}>
                                        <span>{c.name}</span>
                                        {index < (product.collections ?? []).length - 1 && <span className="text-gray-300">, </span>}
                                      </Fragment>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Uncategorized</span>
                                )}
                              </td>
                              <td className="px-10 py-3 text-right whitespace-nowrap align-middle">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 border-none focus:outline-none focus-visible:outline-none">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="font-waldenburg text-[12px]">
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
                                    
                                    <DropdownMenuItem disabled={!!duplicateLoadingId} onClick={() => handleDuplicateProduct(product)}>
                                      <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                      </svg>
                                      {duplicateLoadingId === product.id ? 'Duplicating...' : 'Duplicate'}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem onClick={() => window.open(`/products/${product.id}`, '_blank')}>
                                      <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                        <circle cx="12" cy="12" r="3" />
                                      </svg>
                                      Store View
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem onClick={() => openDeleteDialog(product.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </DraggableRow>
                          );
                        })}
                      </tbody>
                    </table>
                  </SortableContext>
                </DndContext>
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
                      <AdminButton variant="outline">Add Product</AdminButton>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1); // Reset to first page when changing page size
            }}
          >
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue>{pageSize} per page</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="text-sm text-muted-foreground">
            {totalProducts} total items
          </div>
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {currentPage} of {Math.ceil(totalProducts / pageSize)}
          </div>
          <div className="flex items-center space-x-2">
            <AdminButton
              variant="outline"
              size="sm"
              className="h-9 px-4 py-2 rounded-md"
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </AdminButton>
            <AdminButton
              variant="outline"
              size="sm"
              className="h-9 px-4 py-2 rounded-md"
              onClick={() => setCurrentPage(page => Math.min(Math.ceil(totalProducts / pageSize), page + 1))}
              disabled={currentPage === Math.ceil(totalProducts / pageSize)}
            >
              Next
            </AdminButton>
          </div>
        </div>
      </div>
    </div>
  );
}