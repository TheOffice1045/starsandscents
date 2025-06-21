"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Package, ShoppingBag, Calendar, Clock, MoreVertical, FileText, RefreshCw, Mail, Truck, X, Info } from "lucide-react";
import { ProductImage } from "@/components/ui/product-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const ORDER_STEPS = [
  { key: 'ordered', label: 'Ordered' },
  { key: 'processed', label: 'Processed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

const badgeColors = [
  'bg-blue-100 text-blue-700',    // Ordered
  'bg-yellow-100 text-yellow-700',// Processed
  'bg-orange-100 text-orange-700',// Shipped
  'bg-green-100 text-green-700',  // Delivered
];

function getOrderStep(status: string) {
  // Map your backend statuses to stepper steps
  const map: Record<string, string> = {
    'pending': 'ordered',
    'awaiting_payment': 'ordered',
    'processing': 'processed',
    'paid': 'processed',
    'fulfilled': 'shipped',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'completed': 'delivered',
    'cancelled': 'ordered', // treat as early exit
    'refunded': 'delivered',
  };
  return map[status?.toLowerCase()] || 'ordered';
}

function OrderStepper({ status }: { status: string }) {
  const currentStep = getOrderStep(status);
  const currentIdx = ORDER_STEPS.findIndex(s => s.key === currentStep);

  const stepColors = [
    '#60a5fa',    // Ordered (blue-400, for bar)
    '#facc15',    // Processed (yellow-500, for bar)
    '#fb923c',    // Shipped (orange-500, for bar)
    '#22c55e',    // Delivered (green-500, for bar)
  ];
  const stepTextColors = [
    '#1d4ed8',    // Ordered (blue-700)
    '#a16207',    // Processed (yellow-700)
    '#c2410c',    // Shipped (orange-700)
    '#15803d',    // Delivered (green-700)
  ];

  const getStepColor = (stepIdx: number) => {
    if (stepIdx > currentIdx) return 'text-gray-400';
    if (stepIdx === ORDER_STEPS.length - 1) return 'text-green-600'; // Delivered is always green
    if (stepIdx === currentIdx) {
      switch (currentStep) {
        case 'ordered': return 'text-blue-400';
        case 'processed': return 'text-yellow-600';
        case 'shipped': return 'text-orange-600';
        default: return 'text-primary';
      }
    }
    return 'text-gray-600'; // Completed previous steps
  };

  // Calculate the percentage of the bar to fill
  const percent = ((currentIdx + 1) / ORDER_STEPS.length) * 100;

  // Build the gradient string up to the current step
  const gradientColors = stepColors.slice(0, currentIdx + 1);
  const gradientStops = gradientColors.map((color, idx) => {
    const stopPercent = (idx / (ORDER_STEPS.length - 1)) * percent;
    return `${color} ${stopPercent}%`;
  });
  // Add the last color at the fill percent
  if (gradientColors.length > 0) {
    gradientStops.push(`${gradientColors[gradientColors.length - 1]} ${percent}%`);
  }
  // Add gray for the rest
  gradientStops.push(`#e5e7eb ${percent}%`, `#e5e7eb 100%`); // gray-200

  const gradient = `linear-gradient(90deg, ${gradientStops.join(', ')})`;

  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex flex-1 items-center justify-between">
          {ORDER_STEPS.map((step, idx) => (
            <span
              key={step.key}
              className={
                'text-xs font-normal' + (idx > currentIdx ? ' text-gray-400' : '')
              }
              style={
                idx <= currentIdx
                  ? { minWidth: 60, textAlign: 'center', color: stepTextColors[idx] }
                  : { minWidth: 60, textAlign: 'center' }
              }
            >
              {step.label}
            </span>
          ))}
        </div>
        <Badge className={`ml-4 ${badgeColors[currentIdx]}`}>{ORDER_STEPS[currentIdx].label}</Badge>
      </div>
      <div className="w-full">
        <div className="relative h-0.5 w-full bg-gray-200 rounded-full overflow-hidden mt-2">
          <div
            className="absolute left-0 top-0 h-0.5 w-full rounded-full transition-all duration-300"
            style={{ background: gradient }}
          />
        </div>
      </div>
    </div>
  );
}

export default function OrdersTab({ user }: { user: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showTrackingMessageFor, setShowTrackingMessageFor] = useState<string | null>(null);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const fetchOrders = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items:order_items(*)')
        .eq('customer_email', user.email)
        .not('status', 'eq', 'draft')
        .not('status', 'eq', 'cart')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
        return;
      }

      console.log('Fetched orders:', data);
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
    setLoading(false);
  }
  }, [user, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Function to determine badge color based on order status
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, any> = {
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

  // Function to check if order is within cancellation window (2 hours)
  const isOrderCancellable = (orderDate: string) => {
    try {
      const orderTime = new Date(orderDate).getTime();
      const currentTime = new Date().getTime();
      const twoHoursInMs = 2 * 60 * 60 * 1000;
      return currentTime - orderTime <= twoHoursInMs;
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
      
      toast.success('Order cancelled successfully');
      await fetchOrders();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order. Please try again.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Function to handle item cancellation
  const handleCancelItem = async (orderId: string, itemId: string) => {
    if (!orderId || !itemId) return;
    setCancellingItemId(itemId);
    try {
      // Update order_item status to cancelled
      const { error } = await supabase
        .from('order_items')
        .update({ status: 'cancelled' })
        .eq('id', itemId);
      if (error) throw error;
      
      toast.success('Item cancelled successfully');
      await fetchOrders();
    } catch (error: any) {
      console.error('Error cancelling item:', error);
      toast.error('Failed to cancel item. Please try again.');
    } finally {
      setCancellingItemId(null);
    }
  };

  // Action handlers (stubs for now)
  const handleDownloadInvoice = (order: any) => {
    toast.info('Download invoice coming soon!');
  };
  const handleReorder = (order: any) => {
    toast.info('Reorder coming soon!');
  };
  const handleSupport = (order: any) => {
    window.open('mailto:support@candle-store.com?subject=Order%20Support%20Request&body=Order%20ID:%20' + order.order_number, '_blank');
  };
  const handleTrack = (order: any) => {
    const hasTrackingUrl = !!order.tracking_url;
    const hasTrackingInfo = order.tracking_info && Array.isArray(order.tracking_info) && order.tracking_info.length > 0 && order.tracking_info[0].trackingNumber;

    if (hasTrackingUrl) {
      window.open(order.tracking_url, '_blank');
      setShowTrackingMessageFor(null);
    } else if (hasTrackingInfo) {
      const info = order.tracking_info[0];
      const carrier = info.carrier.toLowerCase();
      let url;
      switch (carrier) {
        case 'ups': url = `https://www.ups.com/track?loc=en_US&tracknum=${info.trackingNumber}`; break;
        case 'usps': url = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${info.trackingNumber}`; break;
        case 'fedex': url = `https://www.fedex.com/apps/fedextrack/?tracknumbers=${info.trackingNumber}`; break;
        case 'dhl': url = `https://www.dhl.com/en/express/tracking.html?AWB=${info.trackingNumber}`; break;
        default: url = `https://www.google.com/search?q=${info.carrier}+tracking+${info.trackingNumber}`;
      }
      window.open(url, '_blank');
      setShowTrackingMessageFor(null);
    } else {
      setShowTrackingMessageFor(prev => (prev === order.id ? null : order.id));
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
            {orders.map((order) => {
              const currentStep = getOrderStep(order.payment_status);
              const currentIdx = ORDER_STEPS.findIndex(s => s.key === currentStep);
              return (
                <div key={order.id} className="rounded-xl border bg-white/80 shadow-sm p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Placed {formatDate(order.created_at)}</span>
                        <span>•</span>
                        <span>Order <span className="font-semibold">#{order.order_number || order.id.substring(0, 8)}</span></span>
                        <span>•</span>
                        <span>Total: <span className="font-semibold">${order.total?.toFixed(2) || '0.00'}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                      <Badge className={`${badgeColors[currentIdx]}`}>{ORDER_STEPS[currentIdx].label}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8 border-none shadow-none">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedOrder(order); setShowDetails(true); }}>
                            <Package className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadInvoice(order)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Download Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReorder(order)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reorder
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSupport(order)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Contact Support
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTrack(order)}>
                            <Truck className="mr-2 h-4 w-4" />
                            Track Shipment
                          </DropdownMenuItem>
                          {order.status !== 'cancelled' && isOrderCancellable(order.created_at) && (
                            <DropdownMenuItem onClick={() => handleCancelOrder(order.id)} className="text-red-600">
                              <X className="mr-2 h-4 w-4" />
                              Cancel Order
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {order.order_items?.map((item: any, index: number) => {
                      const isItemCancellable = order.status !== 'cancelled' && isOrderCancellable(order.created_at) && (item.status === undefined || item.status === null || item.status === 'active');
                      return (
                        <div key={`${order.id}-item-${index}`} className={`flex gap-4 items-center ${item.status === 'cancelled' ? 'opacity-60' : ''}`}>
                          <div className="relative h-16 w-16 min-w-[4rem]">
                            <ProductImage
                              url={item.image_url || item.product_image || '/placeholder.png'}
                              alt={item.product_name || item.name}
                              className="object-cover rounded-md h-16 w-16"
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
                          <div className="flex items-center justify-end gap-2 min-w-[100px]">
                            <p className="font-medium">${((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</p>
                            {item.status === 'cancelled' ? (
                              <span className="text-xs text-red-500 font-semibold ml-2">Cancelled</span>
                            ) : (
                              isItemCancellable && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="px-2 py-0 h-6 text-xs font-normal"
                                  disabled={cancellingItemId === item.id}
                                  onClick={() => handleCancelItem(order.id, item.id)}
                                >
                                  {cancellingItemId === item.id ? 'Cancelling...' : 'Cancel'}
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {showTrackingMessageFor === order.id && (
                    <div className="mt-2 flex items-center gap-3 rounded-md border bg-gray-50 p-3">
                      <Info className="h-5 w-5 flex-shrink-0 text-gray-500" />
                      <p className="text-sm text-gray-700">Tracking not available for this order.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Full details for your order.</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Placed {formatDate(selectedOrder.created_at)}</span>
                    <span>•</span>
                    <span>Order <span className="font-medium">#{selectedOrder.order_number || selectedOrder.id.substring(0, 8)}</span></span>
                  </div>
                  <div className="text-lg font-semibold">
                    Total: ${selectedOrder.total?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div className="w-full">
                  <OrderStepper status={selectedOrder.payment_status} />
                </div>
                </div>
                
              <div className="bg-gray-50 rounded-lg">
                <div className="max-h-[400px] overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {selectedOrder.order_items?.map((item: any, index: number) => {
                      const isItemCancellable = selectedOrder.status !== 'cancelled' && isOrderCancellable(selectedOrder.created_at) && (item.status === undefined || item.status === null || item.status === 'active');
                      return (
                        <div key={`${selectedOrder.id}-item-${index}`} className={`flex gap-4 items-center ${item.status === 'cancelled' ? 'opacity-60' : ''}`}>
                          <div className="relative h-16 w-16 min-w-[4rem]">
                            <ProductImage
                              url={item.image_url || item.product_image || '/placeholder.png'}
                              alt={item.product_name || item.name}
                              className="object-cover rounded-md h-16 w-16"
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
                          <div className="flex items-center justify-end gap-2 min-w-[100px]">
                        <p className="font-medium">${((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</p>
                            {item.status === 'cancelled' ? (
                              <span className="text-xs text-red-500 font-semibold ml-2">Cancelled</span>
                            ) : (
                              isItemCancellable && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                                  className="px-2 py-0 h-6 text-xs font-normal"
                                  disabled={cancellingItemId === item.id}
                                  onClick={() => handleCancelItem(selectedOrder.id, item.id)}
                    >
                                  {cancellingItemId === item.id ? 'Cancelling...' : 'Cancel'}
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}