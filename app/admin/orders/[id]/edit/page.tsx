"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

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

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId, fetchOrder]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          payment_status: formData.payment_status,
          fulfillment_status: formData.fulfillment_status,
          total: formData.total,
          subtotal: formData.subtotal,
          tax: formData.tax,
          shipping: formData.shipping,
          discount: formData.discount,
          notes: formData.notes,
          is_open: formData.is_open,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Add to order history
      await supabase
        .from('order_history')
        .insert({
          order_id: orderId,
          status_from: order?.fulfillment_status,
          status_to: formData.fulfillment_status,
          notes: 'Order updated via admin panel'
        });

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
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Edit Order</h1>
            <p className="text-gray-600">Order {order.order_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer Name</label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                placeholder="Customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Customer Email</label>
              <Input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                placeholder="customer@example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Payment Status</label>
              <Select
                value={formData.payment_status}
                onValueChange={(value) => setFormData({...formData, payment_status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="authorized">Authorized</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fulfillment Status</label>
              <Select
                value={formData.fulfillment_status}
                onValueChange={(value) => setFormData({...formData, fulfillment_status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fulfillment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                  <SelectItem value="partially_fulfilled">Partially Fulfilled</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subtotal</label>
              <Input
                type="number"
                step="0.01"
                value={formData.subtotal}
                onChange={(e) => setFormData({...formData, subtotal: parseFloat(e.target.value) || 0})}
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
                value={formData.total}
                onChange={(e) => setFormData({...formData, total: parseFloat(e.target.value) || 0})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Order Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full p-3 border rounded-md min-h-[100px] resize-vertical"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Add any notes about this order..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}