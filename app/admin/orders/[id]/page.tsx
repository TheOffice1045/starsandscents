"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreHorizontal, Loader2, CheckCircle, Truck, CreditCard, FileText, MapPin, Mail, Phone, User, Calendar, Package, DollarSign, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import React, { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { AdminButton } from "@/components/ui/admin-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Order {
  id: string;
  customer_name: string;
  email: string;
  shipping_address: any;
  billing_address: any;
  fulfillment_status: string;
  payment_status: string;
  items: any[];
  subtotal: number;
  total: number;
  created_at: string;
  notes?: string;
  shipping_method?: string;
  order_number?: string;
  phone?: string;
}

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const id = params.id;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [printLoading, setPrintLoading] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  // Function to handle payment status update
  const handleConfirmPayment = async () => {
    if (!order) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', id);
      
      if (error) throw error;
      
      setOrder({
        ...order,
        payment_status: 'paid'
      });
      
      toast.success('Payment confirmed successfully');
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast.error(`Failed to confirm payment: ${error.message}`);
    }
  };
  
  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .single();
        
        if (error) {
          console.error('Error fetching store info:', error);
          return;
        }
        
        setStoreInfo(data);
      } catch (err) {
        console.error('Error in fetchStoreInfo:', err);
      }
    };
    
    fetchStoreInfo();
    
    const fetchOrderData = async () => {
      try {
        // First fetch the order data without the nested query
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .single();
        
        if (orderError) {
          console.error('Error fetching order:', orderError.message);
          toast.error('Failed to load order details');
          setLoading(false);
          return;
        }
        
        if (orderData) {
          // Then fetch the order items separately
          const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', id);
            
          if (itemsError) {
            console.error('Error fetching order items:', itemsError.message);
          }
          
          // Always fetch customer data if there's a customer_id, regardless of shipping address
          if (orderData.customer_id) {
            const { data: customerData, error: customerError } = await supabase
              .from('customers')
              .select('*')
              .eq('id', orderData.customer_id)
              .single();
              
            if (customerError) {
              console.error('Error fetching customer:', customerError.message);
            } else if (customerData) {
              // Merge customer data with order data
              orderData.customer_name = orderData.customer_name || customerData.name || customerData.full_name || 
                `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim();
              orderData.email = orderData.email || customerData.email;
              orderData.phone = orderData.phone || customerData.phone;
              
              // Create shipping address from customer data if not already present
              if (!orderData.shipping_address || Object.keys(orderData.shipping_address || {}).length === 0) {
                orderData.shipping_address = customerData.shipping_address || {
                  name: customerData.name || customerData.full_name || `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim(),
                  street: customerData.address || customerData.street_address,
                  city: customerData.city,
                  state: customerData.state || customerData.province,
                  postal_code: customerData.postal_code || customerData.zip_code,
                  country: customerData.country
                };
              }
              
              // Create billing address from customer data if not already present
              if (!orderData.billing_address || Object.keys(orderData.billing_address || {}).length === 0) {
                orderData.billing_address = customerData.billing_address || orderData.shipping_address;
              }
            }
          }
          
          // Format the items with whatever fields are available
          const formattedItems = orderItems?.map(item => {
            // Log the original image data for debugging
            console.log("Original item image data:", {
              image_url: item.image_url,
              product_image: item.product_image
            });
            
            // Try multiple possible image fields
            let imageUrl = item.image_url || item.product_image || item.image || '';
            
            // If image URL is relative, make it absolute
            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
              imageUrl = `/${imageUrl}`;
            }
            
            // If we still don't have a valid image, use placeholder
            if (!imageUrl) {
              imageUrl = "/placeholder.jpg";
            }
            
            console.log("Final image URL:", imageUrl);
            
            return {
              id: item.id,
              name: item.product_name || item.name,
              size: item.variant_name || item.size,
              price: item.price || item.unit_price,
              quantity: item.quantity,
              image_url: imageUrl
            };
          }) || [];
          
          setOrder({
            ...orderData,
            items: formattedItems
          });
        }
      } catch (err) {
        console.error('Error in fetchOrderData:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderData();
  }, [supabase, id]);
  
  // Function to handle printing invoice
  const handlePrintInvoice = async () => {
    if (!order) return;
    
    setPrintLoading(true);
    
    try {
      // Create a new window for the invoice
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Pop-up blocked. Please allow pop-ups for this site.');
        return;
      }
      
      // Use store info if available, otherwise use fallbacks
      const storeName = storeInfo?.store_name || 'Your Store Name';
      const storeAddress = storeInfo?.address || '123 Store Street';
      const storeCity = storeInfo?.city || 'City';
      const storeState = storeInfo?.state || 'State';
      const storeZip = storeInfo?.postal_code || '12345';
      const storeCountry = storeInfo?.country || '';
      const storeEmail = storeInfo?.contact_email || 'store@example.com';
      const storePhone = storeInfo?.contact_phone || '';
      
      // Generate the invoice HTML
      const invoiceHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${order.order_number || `Order #${id.slice(0, 8)}`}</title>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #eee;
            }
            .invoice-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              padding-bottom: 20px;
              border-bottom: 1px solid #eee;
            }
            .invoice-details {
              margin-bottom: 30px;
            }
            .invoice-details-row {
              display: flex;
              margin-bottom: 5px;
            }
            .invoice-details-label {
              width: 150px;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th, td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #eee;
            }
            th {
              background-color: #f9f9f9;
            }
            .text-right {
              text-align: right;
            }
            .total-row {
              font-weight: bold;
            }
            .address-block {
              margin-bottom: 20px;
            }
            .address-title {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .address-content {
              line-height: 1.5;
            }
            @media print {
              body {
                padding: 0;
              }
              .invoice-container {
                border: none;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="invoice-header">
              <div>
                <h1>INVOICE</h1>
                <p>${order.order_number || `Order #${id.slice(0, 8)}`}</p>
              </div>
              <div>
                <h2>${storeName}</h2>
                <p>${storeAddress}<br>${storeCity}, ${storeState} ${storeZip}${storeCountry ? `<br>${storeCountry}` : ''}<br>${storeEmail}${storePhone ? `<br>${storePhone}` : ''}</p>
              </div>
            </div>
            
            <div style="display: flex; justify-content: space-between;">
              <div class="address-block">
                <div class="address-title">Bill To:</div>
                <div class="address-content">
                  ${order.customer_name || 'Guest'}<br>
                  ${order.billing_address?.street || order.shipping_address?.street || ''}<br>
                  ${order.billing_address?.city || order.shipping_address?.city || ''} 
                  ${order.billing_address?.state || order.shipping_address?.state || ''} 
                  ${order.billing_address?.postal_code || order.shipping_address?.postal_code || ''}<br>
                  ${order.billing_address?.country || order.shipping_address?.country || ''}<br>
                  ${order.email || ''}
                </div>
              </div>
              
              <div class="address-block">
                <div class="address-title">Ship To:</div>
                <div class="address-content">
                  ${order.shipping_address?.name || order.customer_name || ''}<br>
                  ${order.shipping_address?.street || ''}<br>
                  ${order.shipping_address?.city || ''} 
                  ${order.shipping_address?.state || ''} 
                  ${order.shipping_address?.postal_code || ''}<br>
                  ${order.shipping_address?.country || ''}<br>
                </div>
              </div>
            </div>
            
            <div class="invoice-details">
              <div class="invoice-details-row">
                <div class="invoice-details-label">Invoice Date:</div>
                <div>${new Date().toLocaleDateString()}</div>
              </div>
              <div class="invoice-details-row">
                <div class="invoice-details-label">Order Date:</div>
                <div>${new Date(order.created_at).toLocaleDateString()}</div>
              </div>
              <div class="invoice-details-row">
                <div class="invoice-details-label">Payment Status:</div>
                <div>${order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}</div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>
                      ${item.name}
                      ${item.size ? `<br><small>${item.size}</small>` : ''}
                    </td>
                    <td>${item.quantity}</td>
                    <td>$${parseFloat(item.price).toFixed(2)}</td>
                    <td class="text-right">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="text-right">Subtotal:</td>
                  <td class="text-right">$${order.subtotal?.toFixed(2) || '0.00'}</td>
                </tr>
                <tr>
                  <td colspan="3" class="text-right">Shipping:</td>
                  <td class="text-right">$0.00</td>
                </tr>
                <tr>
                  <td colspan="3" class="text-right">Tax:</td>
                  <td class="text-right">$${((order.total || 0) - (order.subtotal || 0)).toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" class="text-right">Total:</td>
                  <td class="text-right">$${order.total?.toFixed(2) || '0.00'}</td>
                </tr>
              </tfoot>
            </table>
            
            <div>
              <p><strong>Notes:</strong></p>
              <p>${order.notes || 'No notes'}</p>
            </div>
            
            <div style="margin-top: 40px; text-align: center;">
              <p>We&apos;re here to help!</p>
            </div>
            
            <div class="no-print" style="margin-top: 30px; text-align: center;">
              <button onclick="window.print();" style="padding: 10px 20px; background: #000; color: #fff; border: none; cursor: pointer; font-size: 16px;">
                Print Invoice
              </button>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Write the HTML to the new window and print
      printWindow.document.open();
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      
      // Wait for resources to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          // The print dialog will be triggered by the button in the invoice
        }, 500);
      };
      
      toast.success('Invoice generated successfully');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setPrintLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-white rounded-lg shadow-sm p-8">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-xl font-medium mb-2">Order not found</p>
        <p className="text-muted-foreground mb-6">The order you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <Link href="/admin/orders">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Orders
          </Button>
        </Link>
      </div>
    );
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="container mx-auto py-5 space-y-5 max-w-7xl">
      {/* Breadcrumb and back button */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Link href="/admin/orders" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          Orders
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">
          {order.order_number || `Order #${id.slice(0, 8)}`}
        </span>
      </div>
      
      {/* Header with order info and actions */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold">{order.order_number || `Order #${id.slice(0, 8)}`}</h1>
                <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'} className="ml-2">
                  {order.payment_status === 'paid' ? 'Paid' : 'Pending Payment'}
                </Badge>
                <Badge variant={order.fulfillment_status === 'fulfilled' ? 'success' : 'warning'}>
                  {order.fulfillment_status === 'fulfilled' ? 'Fulfilled' : 'Unfulfilled'}
                </Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(order.created_at)}
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {order.customer_name || 'Guest'}
                </div>
                {order.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <a href={`mailto:${order.email}`} className="text-primary hover:underline">
                      {order.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
              {order.payment_status !== 'paid' && (
                <AdminButton size="sm" variant="outline" onClick={handleConfirmPayment}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Payment
                </AdminButton>
              )}
              
              {order.fulfillment_status !== 'fulfilled' ? (
                <Link href={`/admin/orders/${id}/fulfill`}>
                  <AdminButton size="sm">
                    <Truck className="mr-2 h-4 w-4" />
                    Fulfill Order
                  </AdminButton>
                </Link>
              ) : (
                <AdminButton variant="outline" disabled>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Fulfilled
                </AdminButton>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AdminButton variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </AdminButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" />
                    Edit Order
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Refund
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handlePrintInvoice} disabled={printLoading}>
                    <FileText className="mr-2 h-4 w-4" />
                    {printLoading ? 'Generating...' : 'Print Invoice'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column - Order items and summary */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order Items */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-2 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Order Items</CardTitle>
                <Badge variant={order.fulfillment_status === 'fulfilled' ? 'success' : 'warning'} className="ml-2">
                  {order.fulfillment_status === 'fulfilled' 
                    ? 'Fulfilled' 
                    : `Unfulfilled (${order.items?.length || 0})`}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                <div className="flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5" />
                  Shipping: {order.shipping_method || 'Standard Shipping'}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-center p-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-14 h-14 bg-muted rounded-md overflow-hidden flex-shrink-0 border">
                        <Image 
                          src={item.image_url || "/placeholder.jpg"} 
                          alt={item.name} 
                          width={64}
                          height={64}
                          className="object-cover w-full h-full" 
                          onError={(e) => {
                            // Use this pattern to avoid state updates during render
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Prevent infinite error loops
                            
                            // Use setTimeout to move the state update out of the render cycle
                            setTimeout(() => {
                              target.src = "/placeholder.jpg";
                              console.log("Image failed to load, using placeholder:", item.image_url);
                            }, 0);
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        {item.size && <div className="text-xs text-muted-foreground">{item.size}</div>}
                        <div className="text-xs text-muted-foreground mt-1">
                          ${parseFloat(item.price).toFixed(2)} × {item.quantity}
                        </div>
                      </div>
                    </div>
                    <div className="font-medium text-sm text-right">
                      ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${((order.total || 0) - (order.subtotal || 0)).toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between py-1 font-medium text-base">
                  <span>Total</span>
                  <span>${order.total?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </CardContent>
           
          </Card>
        </div>
        
        {/* Right column - Customer info, notes, etc. */}
        <div className="space-y-5">
          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">{order.customer_name || 'Guest'}</div>
                  <div className="text-xs text-muted-foreground">Customer</div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium mb-1.5">Contact Information</h3>
                <ul className="space-y-1.5">
                  {order.email && (
                    <li className="flex items-start gap-2 text-xs">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <a href={`mailto:${order.email}`} className="text-primary hover:underline">
                          {order.email}
                        </a>
                      </div>
                    </li>
                  )}
                  {order.phone && (
                    <li className="flex items-start gap-2 text-xs">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <div>{order.phone}</div>
                    </li>
                  )}
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium mb-1.5">Shipping Address</h3>
                <div className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/20">
                  {order.shipping_address ? (
                    <>
                      {order.shipping_address.name || order.customer_name || ''}<br />
                      {order.shipping_address.street || ''}<br />
                      {order.shipping_address.city || ''} {order.shipping_address.state || ''} {order.shipping_address.postal_code || ''}<br />
                      {order.shipping_address.country || ''}<br />
                      {order.shipping_address.street && (
                        <Link 
                          href={`https://maps.google.com/?q=${encodeURIComponent(
                            `${order.shipping_address.street}, ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}, ${order.shipping_address.country}`
                          )}`} 
                          target="_blank"
                          className="text-blue-600 hover:underline text-xs mt-1 inline-block"
                        >
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            View map
                          </span>
                        </Link>
                      )}
                    </>
                  ) : (
                    'No shipping address provided'
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium mb-1.5">Billing Address</h3>
                <div className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/20">
                  {order.billing_address && 
                   JSON.stringify(order.billing_address) !== JSON.stringify(order.shipping_address) ? (
                    <>
                      {order.billing_address.name || order.customer_name || ''}<br />
                      {order.billing_address.street || ''}<br />
                      {order.billing_address.city || ''} {order.billing_address.state || ''} {order.billing_address.postal_code || ''}<br />
                      {order.billing_address.country || ''}
                    </>
                  ) : (
                    'Same as Shipping Address'
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Notes */}
          <Card>
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Notes</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit notes</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground italic break-all whitespace-pre-wrap">
                {order.notes || 'No notes from customer'}
              </p>
            </CardContent>
          </Card>
          
          {/* Timeline/Activity */}
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="pl-3 pr-5 py-1">
                <div className="relative border-l border-muted pl-5 pb-1 pt-3">
                  <div className="absolute -left-1.5 top-3.5 h-3 w-3 rounded-full border-2 border-primary bg-background"></div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium">Order created</span>
                    <time className="text-[10px] text-muted-foreground">{formatDate(order.created_at)}</time>
                  </div>
                </div>
                
                {order.payment_status === 'paid' && (
                  <div className="relative border-l border-muted pl-5 pb-1 pt-5">
                    <div className="absolute -left-1.5 top-6 h-3 w-3 rounded-full border-2 border-primary bg-background"></div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium">Payment received</span>
                      <time className="text-[10px] text-muted-foreground">Payment confirmed</time>
                    </div>
                  </div>
                )}
                
                {order.fulfillment_status === 'fulfilled' && (
                  <div className="relative border-l border-muted pl-5 pb-1 pt-5">
                    <div className="absolute -left-1.5 top-6 h-3 w-3 rounded-full border-2 border-primary bg-background"></div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium">Order fulfilled</span>
                      <time className="text-[10px] text-muted-foreground">Items have been shipped</time>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}