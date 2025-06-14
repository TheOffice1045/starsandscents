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
import { ArrowLeft, Search, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormLabel } from "@/components/ui/form";
import Image from "next/image";

interface SelectedProduct {
  id: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  variant?: string;
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
  
  // Add this function to filter customers based on search query
  const filteredCustomers = customers.filter((customer) => {
    const query = customerSearchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      (customer.email && customer.email.toLowerCase().includes(query)) ||
      (customer.phone && customer.phone.includes(query))
    );
  });
  
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
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
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
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query)
    );
  });

  const handleAddProducts = (productsToAdd: typeof filteredProducts) => {
    // First check if any products are already selected to avoid duplicates
    const existingProductIds = selectedProducts.map(p => p.id);
    
    const newProductsToAdd = productsToAdd
      .filter(p => !existingProductIds.includes(p.id))
      .map(p => ({
        ...p,
        quantity: 1
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
        total: product.price * product.quantity
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
                              <Image src="/placeholder.png" alt="" width={32} height={32} className="w-8 h-8" />
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
        <DialogContent className="max-w-2xl p-0 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="p-6 pb-0">
            <div className="flex justify-between items-center">
              {selectedView === "all-products" && (
                <button
                  onClick={() => setSelectedView("main")}
                  className="text-sm flex items-center text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
              )}
              <DialogTitle className="text-xl">
                {selectedView === "main" ? "Select products" : "All products"}
              </DialogTitle>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto flex-grow">
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input 
                  className="pl-10" 
                  placeholder="Search products"
                  value={searchQuery || ''} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

            {selectedView === "main" ? (
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedView("all-products")}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between rounded-md"
                >
                  <span>All products</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
                <button
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between rounded-md"
                >
                  <span>Collections</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                  </div>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <div 
                      key={product.id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleProductSelection(product.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={selectedModalProducts.includes(product.id)}
                          readOnly // Add this to prevent onChange during render
                          onClick={(e) => { // Change from onChange to onClick
                            e.stopPropagation();
                            toggleProductSelection(product.id);
                          }}
                        />
                        <div>
                          <h3 className="font-medium">{product.name}</h3>
                          <p className="text-sm text-gray-500">{product.sku}</p>
                        </div>
                      </div>
                      <span className="text-sm">${product.price.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No products found
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t p-4 flex justify-between items-center mt-auto">
            <div className="text-sm text-gray-500">
              {selectedModalProducts.length} selected
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => {
                setIsSearchModalOpen(false);
                setSelectedModalProducts([]);
              }}>
                Cancel
              </Button>
              <Button onClick={() => {
                const productsToAdd = products.filter(p => selectedModalProducts.includes(p.id));
                handleAddProducts(productsToAdd);
                setSelectedModalProducts([]);
              }}>
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    
    {/* Add this at the end of the component, after the product search dialog */}
          <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
            <DialogContent className="max-w-2xl p-0 max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader className="p-6 pb-0">
                <div className="flex justify-between items-center">
                  <DialogTitle className="text-xl">Select customer</DialogTitle>
                  <button
                    onClick={() => setIsCustomerModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </DialogHeader>
    
              <div className="p-6 overflow-y-auto flex-grow">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input 
                    className="pl-10" 
                    placeholder="Search customers"
                    value={customerSearchQuery} 
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  />
                </div>
    
                <div className="space-y-1">
                  {isLoadingCustomers ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <div 
                        key={customer.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer rounded-md"
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-medium">{customer.name}</h3>
                            {customer.email && <p className="text-sm text-gray-500">{customer.email}</p>}
                            {customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No customers found
                    </div>
                  )}
                </div>
              </div>
    
              <div className="border-t p-4 flex justify-between items-center mt-auto">
                <div className="text-sm text-gray-500">
                  {/* Placeholder for potential future functionality */}
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => {
                    setIsCustomerModalOpen(false);
                    setCustomerSearchQuery("");
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    setIsCustomerModalOpen(false);
                    // If we want to add "create new customer" functionality in the future
                  }}>
                    Create new customer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
    </div>
  );
}