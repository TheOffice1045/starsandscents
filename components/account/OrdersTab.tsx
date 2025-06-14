"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Package, ShoppingBag, Calendar, Clock } from "lucide-react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function OrdersTab({ user }: { user: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    async function fetchOrders() {
      if (!user?.email) return;

      setLoading(true);
      
      // Get customer ID from email
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (customerError) {
        console.error("Error fetching customer:", customerError);
        setLoading(false);
        return;
      }
      
      if (customerData) {
        // Fetch orders for the current user
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('customer_id', customerData.id)
          .not('status', 'eq', 'draft')
          .not('status', 'eq', 'cart')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching orders:', error);
        } else {
          setOrders(data || []);
        }
      }
      
      setLoading(false);
    }

    fetchOrders();
  }, [user, supabase]);

  // Function to determine badge color based on order status
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': 'success',
      'fulfilled': 'success',
      'processing': 'warning',
      'pending': 'secondary',
      'pending_payment': 'secondary',
      'payment_processing': 'warning',
      'paid': 'success',
      'cancelled': 'destructive',
      'refunded': 'outline'
    };
    
    return statusMap[status?.toLowerCase()] || 'secondary';
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Function to check if order is within cancellation window (1 hour)
  const isOrderCancellable = (orderDate: string) => {
    try {
      const orderTime = new Date(orderDate).getTime();
      const currentTime = new Date().getTime();
      const oneHourInMs = 60 * 60 * 1000;
      
      return currentTime - orderTime <= oneHourInMs;
    } catch (e) {
      return false;
    }
  };
  
  // Function to handle order cancellation
  const handleCancelOrder = async (orderId: string) => {
    if (!orderId) return;
    
    setCancellingOrderId(orderId);
    
    try {
      // Update order status to cancelled
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
      
      if (error) throw error;
      
      // Update local state to reflect cancellation
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: 'cancelled' } 
          : order
      ));
      
      toast.success('Order cancelled successfully');
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order. Please try again.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
            <CardDescription>Your purchase history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={`skeleton-${item}`} className="flex items-start gap-4 p-4 border rounded-md">
                  <div className="h-16 w-16 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-1/4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShoppingBag className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No purchases yet</h3>
          <p className="text-gray-500 mb-6 text-center">When you make a purchase, it will appear here.</p>
          <Link href="/shop">
            <Button>Start Shopping</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Orders</CardTitle>
          <CardDescription>Your purchase history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {orders.map((order) => (
              <div key={order.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Order placed on {formatDate(order.created_at)}</span>
                  </div>
                  <Badge 
                    className={`px-3 py-1 rounded-full text-xs font-medium pointer-events-none ${
                      order.status === 'cancelled' 
                        ? 'bg-red-100 text-red-800 border border-red-200' 
                        : order.payment_status === 'paid' 
                          ? (order.fulfillment_status === 'fulfilled' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200')
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}
                  >
                    {order.status === 'cancelled' 
                      ? 'Cancelled'
                      : order.payment_status === 'paid' 
                        ? (order.fulfillment_status === 'fulfilled' ? 'Completed' : 'Processing') 
                        : <span>Awaiting Payment</span>}
                  </Badge>
                </div>
                
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Order #{order.order_number || order.id.substring(0, 8)}</span>
                  <span>•</span>
                  <span>Total: ${order.total?.toFixed(2) || '0.00'}</span>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {order.order_items?.map((item: any, index: number) => (
                    <div key={`${order.id}-item-${index}`} className="flex gap-4 items-center">
                      <div className="relative h-16 w-16">
                        <Image
                          src={item.image_url || '/placeholder.png'}
                          alt={item.name}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.product_name || item.name}</h4>
                        {item.variant_name && (
                          <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm">${(item.price || item.unit_price || 0).toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end">
                  {order.status !== 'cancelled' && isOrderCancellable(order.created_at) ? (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-xs px-2 py-1 h-7 text-red-600 hover:text-red-700"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingOrderId === order.id}
                    >
                      {cancellingOrderId === order.id ? (
                        <>
                          <span className="mr-1">Cancelling...</span>
                          <span className="animate-spin">⟳</span>
                        </>
                      ) : (
                        <>Cancel Order</>
                      )}
                    </Button>
                  ) : null}
                </div>
                
                {orders.indexOf(order) < orders.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}