"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, X, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect, useCallback } from "react"; // Added useCallback import
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBrowserClient } from "@supabase/ssr";
import type { CartItem } from '@/lib/store/cart';

interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  shipping_address: any;
  fulfillment_status: string;
  items: any[];
  shipping_method: string;
  tracking_info?: TrackingInfo[];
  // Add other fields as needed
}

export default function FulfillOrderPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const orderId = params.id;
  const orderNumber = `#${orderId}`;
  const locationAddress = "33 New Montgomery St";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [trackingInfos, setTrackingInfos] = useState<TrackingInfo[]>([{ trackingNumber: "", carrier: "" }]);
  const [orderStatus, setOrderStatus] = useState('unfulfilled');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Consolidated fetch function
  const fetchOrderData = useCallback(async () => {
    try {
      console.log('Fetching order data for ID:', orderId);
      
      // Check if ID is valid
      if (!orderId) {
        console.error('Invalid order ID');
        toast.error('Invalid order ID');
        setLoading(false);
        return;
      }
      
      // Get the order with items included
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (orderError) {
        console.error('Error fetching order:', orderError);
        toast.error(`Failed to load order details: ${orderError.message}`);
        setLoading(false);
        return;
      }
      
      if (!orderData) {
        console.error('No order found with ID:', orderId);
        toast.error('Order not found');
        setLoading(false);
        return;
      }
      
      console.log('Order data received:', orderData);
      
      // Set the order with items from the order data
      setOrder({
        ...orderData,
        items: orderData.items || []
      });
      
      // Set order status
      setOrderStatus(orderData.fulfillment_status || 'unfulfilled');
      
      // Load any existing tracking info if available
      if (orderData.tracking_info && Array.isArray(orderData.tracking_info) && orderData.tracking_info.length > 0) {
        setTrackingInfos(orderData.tracking_info);
      }
    } catch (err) {
      console.error('Error in fetchOrderData:', err);
      toast.error('An unexpected error occurred while loading the order');
    } finally {
      setLoading(false);
    }
  }, [orderId, supabase]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Reset loading state when ID changes
    setLoading(true);
    fetchOrderData();
  }, [fetchOrderData]); // This is now safe to include

  const carriers = [
    { id: "fedex", name: "FedEx" },
    { id: "ups", name: "UPS" },
    { id: "usps", name: "USPS" },
    { id: "dhl", name: "DHL" },
  ];

  const addTrackingNumber = () => {
    setTrackingInfos([...trackingInfos, { trackingNumber: "", carrier: "" }]);
  };

  const updateTrackingInfo = (index: number, field: keyof TrackingInfo, value: string) => {
    const newTrackingInfos = [...trackingInfos];
    newTrackingInfos[index][field] = value;
    setTrackingInfos(newTrackingInfos);
  };

  const removeTrackingInfo = (index: number) => {
    setTrackingInfos(trackingInfos.filter((_, i) => i !== index));
  };

  const handleFulfillment = async () => {
    setIsSubmitting(true);
  
    try {
      // Validate tracking information
      if (trackingInfos.some(info => !info.trackingNumber || !info.carrier)) {
        toast.error("Please fill in all tracking information");
        setIsSubmitting(false);
        return;
      }
  
      // Update order fulfillment status in database
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          fulfillment_status: 'fulfilled',
          tracking_info: trackingInfos,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
  
      if (orderError) throw orderError;
  
      // Update local state
      setOrderStatus('fulfilled');

      if (notifyCustomer) {
        console.log('Sending notification to customer with tracking:', trackingInfos);
      }
  
      toast.success("Order fulfilled successfully");
      router.push('/admin/orders?status=fulfilled');
      router.refresh();
  
    } catch (error: any) {
      console.error('Fulfillment error:', error);
      toast.error(error.message || "Failed to fulfill order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rest of the component remains unchanged
  return (
    <div className="max-w-5xl mx-auto">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      ) : order ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href={`/admin/orders/${orderId}`}>
                <Button variant="ghost">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to order
                </Button>
              </Link>
              <h1 className="text-sm font-medium truncate max-w-md">Fulfill items - {order.order_number}</h1>
            </div>
            <Button variant="outline">Print packing slip</Button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded text-sm ${
                    orderStatus === 'fulfilled' 
                      ? "bg-green-100 text-green-800" 
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {orderStatus === 'fulfilled' 
                      ? 'Fulfilled' 
                      : orderStatus === 'partially_fulfilled'
                        ? 'Partially Fulfilled'
                        : 'Unfulfilled'}
                    {orderStatus !== 'fulfilled' && " (2)"}
                  </span>
                  <span className="text-xs text-gray-500">{orderNumber}</span>
                </div>

                <div className="mb-6">
                  <h2 className="font-medium mb-2">{order?.customer_name || ''}</h2>
                  <div className="text-sm text-gray-500">
                    {order?.shipping_address?.street || ''}
                  </div>
                </div>

                <div className="space-y-4">
                  {order?.items?.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 py-4 border-t">
                      <div className="w-16 h-16 bg-gray-100 rounded">
                        <Image 
                          src={item.image_url || "/placeholder.jpg"} 
                          alt={item.name} 
                          width={64} 
                          height={64} 
                          className="rounded" 
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-blue-600">{item.name}</div>
                        {item.size && <div className="text-sm text-gray-500">{item.size}</div>}
                      </div>
                      <div className="text-sm">
                        <span>{item.weight || '0'} kg</span>
                        <div className="inline-flex items-center border rounded-md ml-4">
                          <span className="px-3">{item.quantity || 1}</span>
                          <span className="text-gray-500 px-2 border-l">of {item.quantity || 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium mb-1">Add tracking to improve customer satisfaction</h3>
                      <p className="text-sm text-gray-600">
                        Orders with tracking let customers receive delivery updates and reduce support requests.
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Tracking information</h3>
                    {trackingInfos.map((info, index) => (
                      <div key={index} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-600 mb-1 block">
                              Tracking number
                            </label>
                            <Input
                              placeholder="Enter tracking number"
                              value={info.trackingNumber}
                              onChange={(e) => updateTrackingInfo(index, 'trackingNumber', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600 mb-1 block">
                              Shipping carrier
                            </label>
                            <Select
                              value={info.carrier}
                              onValueChange={(value) => updateTrackingInfo(index, 'carrier', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select carrier" />
                              </SelectTrigger>
                              <SelectContent>
                                {carriers.map((carrier) => (
                                  <SelectItem key={carrier.id} value={carrier.id}>
                                    {carrier.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {trackingInfos.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTrackingInfo(index)}
                            className="text-red-600"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="link"
                      className="text-blue-600 p-0"
                      onClick={addTrackingNumber}
                    >
                      + Add another tracking number
                    </Button>
                  </div>

                  <div>
                    <h3 className="font-medium mb-4">Notify customer of shipment</h3>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="notify"
                        checked={notifyCustomer}
                        onCheckedChange={(checked) => setNotifyCustomer(checked as boolean)}
                      />
                      <label htmlFor="notify" className="text-sm text-gray-600">
                        Send shipment details to your customer now
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      orderStatus === 'fulfilled' 
                        ? "bg-green-100 text-green-800" 
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {orderStatus === 'fulfilled' 
                        ? 'Fulfilled' 
                        : orderStatus === 'partially_fulfilled'
                          ? 'Partially Fulfilled'
                          : 'Unfulfilled'}
                      {orderStatus !== 'fulfilled' && order?.items?.length > 0 ? ` (${order.items.length})` : ''}
                    </span>
                    <Button variant="ghost" size="sm">•••</Button>
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <div>Delivery method</div>
                  <div>{order?.shipping_method || 'Standard'}</div>
                </div>

                <div className="space-y-4">
                  {order?.items?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-4 border-t first:border-t-0">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden">
                          <Image 
                            src={item.image_url || "/placeholder.jpg"} 
                            alt={item.name || 'Product'} 
                            width={48} 
                            height={48} 
                            className="object-cover w-full h-full" 
                          />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          {item.size && <div className="text-xs text-gray-500">{item.size}</div>}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        × {item.quantity || 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-medium mb-4">Shipping from</h2>
                <div className="text-sm">
                  <div className="font-medium">Your store</div>
                  <div className="text-gray-500">{locationAddress}</div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleFulfillment} 
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Mark as fulfilled'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div>Order not found</div>
      )}
    </div>
  );
}