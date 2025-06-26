"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminButton } from "@/components/ui/admin-button";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Search, ChevronRight, X, ChevronLeft } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormLabel } from "@/components/ui/form";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";

interface SelectedProduct {
  id: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  variant?: string;
  image_url?: string;
}

// Remove the problematic comment examples and replace with proper comments
/* 
 * Note: Make sure all SelectItem components have non-empty values.
 * Example: Use <SelectItem value="none">None</SelectItem> 
 * instead of <SelectItem value="">None</SelectItem>
 */

export default function CreateOrderPage() {
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedModalProducts, setSelectedModalProducts] = useState<number[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: number;
    name: string;
    email: string;
    phone?: string;
  } | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customers, setCustomers] = useState<Array<{
    id: number;
    name: string;
    email: string;
    phone?: string;
  }>>([]);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedView, setSelectedView] = useState<"main" | "all-products">("main");
  const [notes, setNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(5);
  
  // Add this function to filter customers based on search query
  const filteredCustomers = customers.filter((customer) => {
    const query = customerSearchQuery.toLowerCase();
    return (
      (customer.name?.toLowerCase() || "").includes(query) ||
      (customer.email?.toLowerCase() || "").includes(query) ||
      (customer.phone || "").includes(query)
    );
  });
  
  const paginatedCustomers = filteredCustomers.slice(
    (customerCurrentPage - 1) * customerPageSize,
    customerCurrentPage * customerPageSize
  );
  
  // Replace hardcoded products with state that will be populated from database
  const [products, setProducts] = useState<Array<{
    id: number;
    name: string;
    sku: string;
    price: number;
    image_url?: string;
  }>>([]);
  
  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  // Define fetchProducts outside of useEffect
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Fetch all product images
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('product_id, url, position')
        .order('position', { ascending: true });

      if (imagesError) throw imagesError;

      // Attach first image to each product and map 'title' to 'name'
      const productsWithImages = (productsData || []).map(product => {
        const productImages = (imagesData || []).filter(img => img.product_id === product.id);
        return {
          ...product,
          name: product.title, // Map title to name for compatibility
          image_url: productImages.length > 0 ? productImages[0].url : undefined,
        };
      });

      setProducts(productsWithImages);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Add this function to fetch customers
  const fetchCustomers = useCallback(async () => {
    setIsLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [supabase]);

  // Add this function to handle customer selection
  const handleSelectCustomer = (customer: typeof customers[0]) => {
    setSelectedCustomer(customer);
    setIsCustomerModalOpen(false);
    setCustomerSearchQuery("");
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedModalProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      (product.name?.toLowerCase() || "").includes(query) ||
      (product.sku?.toLowerCase() || "").includes(query)
    );
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAddProducts = (productsToAdd: typeof filteredProducts) => {
    // First check if any products are already selected to avoid duplicates
    const existingProductIds = selectedProducts.map(p => p.id);
    
    const newProductsToAdd = productsToAdd
      .filter(p => !existingProductIds.includes(p.id))
      .map(p => ({
        ...p,
        quantity: 1,
        image_url: p.image_url // Ensure image_url is included
      }));
    
    // Create a new array to ensure React detects the state change
    setSelectedProducts(prev => [...prev, ...newProductsToAdd]);
    setIsSearchModalOpen(false);
    setSearchQuery("");
    setSelectedModalProducts([]);
  };

  const updateQuantity = (id: number, quantity: number) => {
    setSelectedProducts(prev => prev.map(p => 
      p.id === id ? { ...p, quantity: Math.max(1, quantity) } : p
    ));
  };

  const removeProduct = (id: number) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  const subtotal = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const discount = 0; // TODO: Implement discount functionality
  const shipping = 0; // TODO: Implement shipping functionality
  const taxRate = 0.08; // 8% tax rate - you might want to make this configurable
  const tax = subtotal * taxRate;
  const total = subtotal + shipping - discount + tax;

  const handleCreateOrder = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate form
      if (selectedProducts.length === 0) {
        toast.error("Please add at least one product");
        setIsSubmitting(false);
        return;
      }
      
      // Generate order number
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      
      // First, let's check the structure of the orders table
      const { data: tableInfo, error: tableError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('Error checking orders table:', tableError);
        toast.error(`Failed to create order: ${tableError.message}`);
        setIsSubmitting(false);
        return;
      }
      
      // Log the table structure to help debug
      console.log('Orders table structure:', tableInfo);
      
      // Create an order object with only the fields that exist in the table
      const orderData: Record<string, any> = {
        order_number: orderNumber,
        // Only include customer_id if a customer is actually selected
        ...(selectedCustomer?.id ? { customer_id: selectedCustomer.id } : {}),
        customer_name: selectedCustomer?.name || "Guest",
        customer_email: selectedCustomer?.email || null,
        payment_status: "pending",
        fulfillment_status: "unfulfilled",
        notes: notes,
        subtotal: subtotal,
        shipping: shipping,
        tax: tax,
        total: total,
        is_open: true
      };
      
      // Only add email and phone if they exist in the table structure
      if (tableInfo && tableInfo.length > 0) {
        const sampleOrder = tableInfo[0];
        if ('email' in sampleOrder) {
          orderData.email = selectedCustomer?.email || null;
        }
        if ('phone' in sampleOrder) {
          orderData.phone = selectedCustomer?.phone || null;
        }
        // Add any other fields that might be required but not in our current data
      }
      
      console.log('Inserting order with data:', orderData);
      
      // Create the order with the filtered data
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();
      
      if (orderError) {
        console.error('Order creation error:', orderError);
        throw orderError;
      }
      
      // Create order items
      const orderItems = selectedProducts.map(product => ({
        order_id: order.id,
        product_name: product.name,
        quantity: product.quantity,
        price: product.price,
        total: product.price * product.quantity,
        image_url: product.image_url, // Include image_url for order details page
        status: 'active'
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        throw itemsError;
      }
      
      toast.success("Order created successfully");
      
      // Clear form state before navigation to prevent stale state
      setSelectedProducts([]);
      setNotes("");
      setSelectedModalProducts([]);
      
      // Use router.push with a small delay to ensure state is updated
      setTimeout(() => {
        router.push(`/admin/orders/${order.id}`);
      }, 100);
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(`Failed to create order: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, [fetchCustomers, fetchProducts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <AdminButton size="sm" variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </AdminButton>
        </Link>
        <h1 className="text-xl font-medium">Create order</h1>
        <div className="ml-auto">
        <AdminButton size="sm" 
            onClick={handleCreateOrder}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create order"}
          </AdminButton>
        </div>
      </div>

      <div className="grid grid-cols-[1fr,400px] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-medium mb-4">Products</h2>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input 
                      className="pl-10" 
                      placeholder="Search products"
                      onClick={() => setIsSearchModalOpen(true)}
                      readOnly
                    />
                  </div>
                  <AdminButton
                    variant="outline"
                    onClick={() => setIsSearchModalOpen(true)}
                  >
                    Browse
                  </AdminButton>
                </div>
              </div>

              {searchQuery && filteredProducts.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {filteredProducts.map((product) => (
                    <div 
                      key={product.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                      onClick={() => {
                        // TODO: Add product to order
                        setSearchQuery("");
                      }}
                    >
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.sku}</p>
                      </div>
                      <span className="font-medium">${product.price}</span>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && filteredProducts.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No products found
                </div>
              )}

            
              <div className="border-t pt-4">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-sm font-medium text-gray-500">Product</th>
                      <th className="text-right text-sm font-medium text-gray-500">Quantity</th>
                      <th className="text-right text-sm font-medium text-gray-500">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <Image src={product.image_url || "/placeholder.png"} alt={product.name} width={32} height={32} className="w-8 h-8 object-cover" />
                            </div>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.variant && (
                                <div className="text-sm text-gray-500">{product.variant}</div>
                              )}
                              <div className="text-sm text-gray-500">${product.price}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex justify-end items-center">
                            <div className="flex items-center border rounded">
                              <button
                                className="px-2 py-1 hover:bg-gray-50"
                                onClick={() => updateQuantity(product.id, product.quantity - 1)}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={product.quantity}
                                onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 1)}
                                className="w-12 text-center border-x py-1"
                              />
                              <button
                                className="px-2 py-1 hover:bg-gray-50"
                                onClick={() => updateQuantity(product.id, product.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          ${(product.price * product.quantity).toFixed(2)}
                        </td>
                        <td className="py-4 pl-4">
                          <button
                            onClick={() => removeProduct(product.id)}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Payment</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <Button 
                      variant="link" 
                      className="text-blue-600 h-auto p-0"
                      onClick={() => setIsDiscountModalOpen(true)}
                    >
                      Add discount
                    </Button>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="link" className="text-blue-600 h-auto p-0">Add shipping</Button>
                    <span>${shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-600">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-medium mb-4">Customer</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input 
                className="pl-10" 
                placeholder="Search or create a customer" 
                onClick={() => setIsCustomerModalOpen(true)}
                readOnly
                value={selectedCustomer ? selectedCustomer.name : ''}
              />
            </div>
            
            {selectedCustomer && (
              <div className="mt-4 p-3 border rounded-md bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{selectedCustomer.name}</div>
                    {selectedCustomer.email && (
                      <div className="text-sm text-gray-500">{selectedCustomer.email}</div>
                    )}
                    {selectedCustomer.phone && (
                      <div className="text-sm text-gray-500">{selectedCustomer.phone}</div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          

          <div className="bg-white rounded-lg border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Notes</h2>
            </div>
            <textarea
              className="w-full border rounded-md p-2"
              placeholder="Add a note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          
        </div>
      </div>

      <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
        <DialogContent className="max-w-3xl p-0">
          <div className="flex flex-col h-[70vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <AdminButton variant="ghost" size="sm" onClick={() => setIsSearchModalOpen(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </AdminButton>
              <h2 className="text-md font-medium font-waldenburg">All products</h2>
              <AdminButton variant="ghost" size="icon" onClick={() => setIsSearchModalOpen(false)}>
                <X className="h-4 w-4" />
              </AdminButton>
            </div>

            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto">
              {paginatedProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-4 border-b border-gray-100 font-waldenburg"
                >
                  <Checkbox
                    checked={selectedModalProducts.includes(product.id)}
                    onCheckedChange={() => toggleProductSelection(product.id)}
                  />
                  <div className="w-10 h-10 flex-shrink-0">
                    <Image
                      src={product.image_url || "/placeholder.png"}
                      alt={product.name}
                      width={40}
                      height={40}
                      className="rounded-lg object-cover w-full h-full"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.sku}</div>
                  </div>
                  <div className="font-waldenburg text-sm">${product.price.toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="grid grid-cols-3 items-center p-6 border-t bg-white">
              {/* Left: Pagination */}
              <div className="flex items-center gap-4 justify-self-start">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {Math.ceil(filteredProducts.length / pageSize) || 1}
                </span>
                <div className="flex items-center gap-2">
                  <AdminButton
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </AdminButton>
                  <AdminButton
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredProducts.length / pageSize), p + 1))}
                    disabled={currentPage === Math.ceil(filteredProducts.length / pageSize)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </AdminButton>
                </div>
              </div>

              {/* Middle: Selected Count */}
              <div className="justify-self-center font-medium text-sm font-waldenburg text-gray-500">
                {selectedModalProducts.length} selected
              </div>
              
              {/* Right: Action Buttons */}
              <div className="flex gap-4 justify-self-end">
                <AdminButton size="sm" variant="outline" onClick={() => setIsSearchModalOpen(false)} className="text-xs">
                  Cancel
                </AdminButton>
                <AdminButton
                  size="sm"
                  className="text-xs"
                  onClick={() => handleAddProducts(
                    products.filter(p => selectedModalProducts.includes(p.id))
                  )}
                  
                >
                  Add
                </AdminButton>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    
    {/* Add this at the end of the component, after the product search dialog */}
          <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
            <DialogContent className="max-w-2xl p-0 font-waldenburg">
              <DialogHeader className="p-6 pb-4">
                <div className="flex justify-between items-center">
                  <DialogTitle className="text-xl font-medium">Select customer</DialogTitle>
                  <button
                    onClick={() => setIsCustomerModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </DialogHeader>
    
              <div className="px-6 pb-6">
                <div className="relative mb-6">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input 
                    className="pl-10 h-11" 
                    placeholder="Search customers"
                    value={customerSearchQuery} 
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  />
                </div>
    
                <div className="space-y-2">
                  {isLoadingCustomers ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                    </div>
                  ) : paginatedCustomers.length > 0 ? (
                    paginatedCustomers.map((customer, index) => (
                      <div 
                        key={customer.id}
                        className={`p-4 cursor-pointer rounded-lg ${
                          index === 2 ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <div className="font-medium text-sm">{customer.email || customer.name}</div>
                        {customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No customers found
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center p-4 border-t font-waldenburg">
                 <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      Page {customerCurrentPage} of {Math.ceil(filteredCustomers.length / customerPageSize) || 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <AdminButton
                        variant="outline"
                        size="icon"
                        onClick={() => setCustomerCurrentPage(p => Math.max(1, p - 1))}
                        disabled={customerCurrentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </AdminButton>
                      <AdminButton
                        variant="outline"
                        size="icon"
                        onClick={() => setCustomerCurrentPage(p => Math.min(Math.ceil(filteredCustomers.length / customerPageSize), p + 1))}
                        disabled={customerCurrentPage === Math.ceil(filteredCustomers.length / customerPageSize)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </AdminButton>
                    </div>
                  </div>
              </div>
            </DialogContent>
          </Dialog>
    </div>
  );
}