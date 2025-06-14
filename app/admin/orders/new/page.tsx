"use client";

import { useEffect, useState } from "react";
import { useOrderStore } from "@/lib/store/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";
import Image from 'next/image';

export default function NewOrderPage() {
  const router = useRouter();
  const { createOrder } = useOrderStore();
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  
  // Fetch products and collections directly from the database
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      
      try {
        // Use a simpler approach to check if tables exist
        const { count, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.error('Error accessing products table:', countError);
          toast.error('Database connection error');
          setLoading(false);
          return;
        }
        
        // Fetch products with all necessary fields
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            id, 
            title, 
            price, 
            images, 
            collection_id,
            status,
            quantity,
            track_quantity
          `)
          .eq('status', 'active')
          .order('title');
        
        if (productsError) {
          console.error('Error fetching products:', productsError);
          toast.error('Failed to load products');
          setLoading(false);
          return;
        }

        // Fetch collections
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('id, name')
          .order('name');
        
        if (collectionsError) {
          console.error('Error fetching collections:', collectionsError);
          toast.error('Failed to load collections');
          setLoading(false);
          return;
        }
        
        // Filter out products with no inventory if they're tracking quantity
        const availableProducts = productsData?.filter(product => 
          !product.track_quantity || (product.track_quantity && product.quantity > 0)
        ) || [];
        
        setProducts(availableProducts);
        setCollections(collectionsData || []);
        
        console.log('Fetched products:', availableProducts.length);
        console.log('Fetched collections:', collectionsData?.length || 0);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load products or collections');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filter products by collection
  const filteredProducts = selectedCollection 
    ? products.filter(p => p.collection_id === selectedCollection)
    : products;
  
  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      // Check if product is already in the list
      const existingIndex = selectedProducts.findIndex(p => p.product_id === product.id);
      
      if (existingIndex >= 0) {
        // Increment quantity if already in list
        const newProducts = [...selectedProducts];
        newProducts[existingIndex].quantity += 1;
        setSelectedProducts(newProducts);
      } else {
        // Add new product to list
        setSelectedProducts([...selectedProducts, {
          product_id: product.id,
          title: product.title,
          price: product.price,
          quantity: 1,
          image: product.images && product.images[0] ? product.images[0] : null
        }]);
      }
      
      toast.success(`Added ${product.title} to order`);
    }
  };
  
  const handleRemoveProduct = (index: number) => {
    const newProducts = [...selectedProducts];
    const removedProduct = newProducts[index];
    newProducts.splice(index, 1);
    setSelectedProducts(newProducts);
    
    if (removedProduct) {
      toast.info(`Removed ${removedProduct.title} from order`);
    }
  };
  
  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;
    
    const newProducts = [...selectedProducts];
    newProducts[index].quantity = quantity;
    setSelectedProducts(newProducts);
  };
  
  const calculateTotal = () => {
    return selectedProducts.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };
  
  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Please add at least one product");
      return;
    }
    
    if (!customerName) {
      toast.error("Please enter customer name");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const orderData = {
        customer_name: customerName,
        customer_email: customerEmail || null,
        order_date: new Date().toISOString(),
        status: "pending",
        total: calculateTotal(),
        items: selectedProducts.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        })),
        discount: 0, // Add default discount value
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await createOrder(orderData);
      toast.success("Order created successfully");
      router.push("/admin/orders");
    } catch (error) {
      console.error("Error creating order:", error);
      if (error instanceof Error) {
        toast.error(`Failed to create order: ${error.message}`);
      } else {
        toast.error("Failed to create order: Unknown error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Create New Order</h1>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Order
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                placeholder="Customer name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input 
                value={customerEmail} 
                onChange={(e) => setCustomerEmail(e.target.value)} 
                placeholder="Customer email"
                type="email"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {collections.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Filter by Collection</label>
                    <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Collections" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Collections</SelectItem>
                        {collections.map(collection => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium">Add Products</label>
                  <Select onValueChange={handleAddProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.length === 0 ? (
                        <SelectItem value="none" disabled>No products available</SelectItem>
                      ) : (
                        filteredProducts.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.title} - ${product.price?.toFixed(2) || '0.00'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 mt-4">
                  {selectedProducts.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No products added to this order yet
                    </div>
                  ) : (
                    selectedProducts.map((item, index) => (
                      <div key={index} className="flex items-center justify-between border p-2 rounded">
                        <div className="flex items-center space-x-4">
                          <div className="relative h-16 w-16 flex-shrink-0">
                            <Image
                              src={item.image_url || '/placeholder.png'}
                              alt={item.name}
                              fill
                              className="object-cover rounded-md"
                            />
                          </div>
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-gray-500">${item.price?.toFixed(2) || '0.00'}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))}
                            className="w-16"
                            min="1"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveProduct(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {selectedProducts.length > 0 && (
                  <div className="flex justify-between font-medium pt-4 border-t">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}