"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { AdminButton } from '@/components/ui/admin-button';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

type Order = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  payment_status: string;
  fulfillment_status: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  notes: string | null;
  is_open: boolean;
  created_at: string;
};

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    payment_status: '',
    fulfillment_status: '',
    total: 0,
    subtotal: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
    notes: '',
    is_open: true
  });

  // --- Order Items State ---
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      setOrder(data);
      setFormData({
        customer_name: data.customer_name || '',
        customer_email: data.customer_email || '',
        payment_status: data.payment_status || '',
        fulfillment_status: data.fulfillment_status || '',
        total: data.total || 0,
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        shipping: data.shipping || 0,
        discount: data.discount || 0,
        notes: data.notes || '',
        is_open: data.is_open || true
      });
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId, supabase]);

  // Fetch order items
  const fetchOrderItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    if (!error && data) setOrderItems(data);
  }, [orderId, supabase]);

  // Fetch products for modal
  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('title');
    if (!error && data) setProducts(data);
    setIsLoadingProducts(false);
  }, [supabase]);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      fetchOrderItems();
    }
  }, [orderId, fetchOrder, fetchOrderItems]);

  // --- Order Item Editing Logic ---
  const handleQuantityChange = (itemId: string, quantity: number) => {
    setOrderItems((prev) => prev.map(item => item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item));
  };
  const handleRemoveItem = (itemId: string) => {
    setOrderItems((prev) => prev.filter(item => item.id !== itemId));
  };
  const handleAddProduct = (product: any) => {
    // Prevent duplicates
    if (orderItems.some(item => item.product_id === product.id)) return;
    setOrderItems(prev => [
      ...prev,
      {
        id: `new-${product.id}-${Date.now()}`,
        order_id: orderId,
        product_id: product.id,
        product_name: product.title,
        price: product.price,
        quantity: 1,
        image_url: product.images?.[0] || '',
        status: 'active',
      }
    ]);
    setIsProductModalOpen(false);
    setSearchQuery('');
  };

  // --- Derived Financials ---
  const subtotal = orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const total = subtotal + formData.tax + formData.shipping - formData.discount;

  // --- Save Handler (update order_items and order totals) ---
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update order_items: delete removed, update changed, insert new
      const { data: existingItems } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', orderId);
      const existingIds = (existingItems || []).map(i => i.id);
      const currentIds = orderItems.filter(i => !String(i.id).startsWith('new-')).map(i => i.id);
      // Delete removed
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from('order_items').delete().in('id', toDelete);
      }
      // Update existing
      for (const item of orderItems) {
        if (!String(item.id).startsWith('new-')) {
          await supabase.from('order_items').update({ quantity: item.quantity, price: item.price }).eq('id', item.id);
        }
      }
      // Insert new
      for (const item of orderItems) {
        if (String(item.id).startsWith('new-')) {
          await supabase.from('order_items').insert({
            order_id: orderId,
            product_id: item.product_id,
            product_name: item.product_name,
            price: item.price,
            quantity: item.quantity,
            image_url: item.image_url,
            status: 'active',
          });
        }
      }
      // 2. Recalculate totals
      const newSubtotal = orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const newTotal = newSubtotal + formData.tax + formData.shipping - formData.discount;
      // 3. Update order
      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          payment_status: formData.payment_status,
          fulfillment_status: formData.fulfillment_status,
          total: newTotal,
          subtotal: newSubtotal,
          tax: formData.tax,
          shipping: formData.shipping,
          discount: formData.discount,
          notes: formData.notes,
          is_open: formData.is_open,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      if (error) throw error;
      toast.success('Order updated successfully');
      router.push('/admin/orders');
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Order not found</p>
          <Button onClick={() => router.push('/admin/orders')} className="mt-4">
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </AdminButton>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Edit Order</h1>
            <p className="text-gray-500 text-sm"> <span className="font-mono">{order.order_number}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          <AdminButton variant="outline" onClick={handleCancel}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </AdminButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
        {/* Main Column: Customer/Status + Order Items */}
        <div className="space-y-8">
          {/* Customer Info above Order Items */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <Input
                    value={formData.customer_name}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Email</label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                    placeholder="customer@example.com"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Order Items Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3">
              <CardTitle className="text-lg">Order Items</CardTitle>
              <AdminButton variant="outline" size="sm" onClick={() => { fetchProducts(); setIsProductModalOpen(true); }}>
                + Add Product
              </AdminButton>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orderItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">No products in this order.</td>
                      </tr>
                    ) : (
                      orderItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                              <Image src={item.image_url || '/placeholder.png'} alt={item.product_name} width={48} height={48} className="object-cover w-full h-full" />
                            </div>
                            <div>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-xs text-gray-500">ID: {item.product_id}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">${item.price?.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={e => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                              className="w-20 text-right"
                            />
                          </td>
                          <td className="px-6 py-4 text-right">${(item.price * item.quantity).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Details */}
        <div className="space-y-8">
          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financial Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Subtotal</label>
                <Input
                  type="number"
                  step="0.01"
                  value={subtotal.toFixed(2)}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tax</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.tax}
                  onChange={(e) => setFormData({...formData, tax: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Shipping</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.shipping}
                  onChange={(e) => setFormData({...formData, shipping: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Discount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) => setFormData({...formData, discount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total</label>
                <Input
                  type="number"
                  step="0.01"
                  value={total.toFixed(2)}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full p-3 border rounded-md min-h-[100px] resize-vertical text-sm"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Add any notes about this order..."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- Add Product Modal --- */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Product to Order</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-4">
            <Search className="text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="max-h-80 overflow-y-auto divide-y">
            {isLoadingProducts ? (
              <div className="text-center py-8 text-gray-400">Loading products...</div>
            ) : (
              products.filter(p =>
                p.title.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(product => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAddProduct(product)}
                >
                  <div className="w-10 h-10 flex-shrink-0">
                    <Image src={product.images?.[0] || '/placeholder.png'} alt={product.title} width={40} height={40} className="rounded object-cover w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{product.title}</div>
                    <div className="text-xs text-gray-500">{product.sku}</div>
                  </div>
                  <div className="font-waldenburg text-sm">${product.price?.toFixed(2)}</div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}