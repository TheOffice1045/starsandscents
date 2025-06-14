import { supabase } from '@/lib/supabase';
import { CreateOrderInput, Order, OrderItem, ShippingAddress, BillingAddress, OrderHistory } from '@/types/orders';

export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
  
  return data as Order[];
}

export async function getOrderById(id: string) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  
  if (orderError) {
    console.error('Error fetching order:', orderError);
    throw orderError;
  }
  
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id);
  
  if (itemsError) {
    console.error('Error fetching order items:', itemsError);
    throw itemsError;
  }
  
  const { data: shippingAddress, error: shippingError } = await supabase
    .from('shipping_addresses')
    .select('*')
    .eq('order_id', id)
    .single();
  
  const { data: billingAddress, error: billingError } = await supabase
    .from('billing_addresses')
    .select('*')
    .eq('order_id', id)
    .single();
  
  const { data: history, error: historyError } = await supabase
    .from('order_history')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false });
  
  return {
    order,
    items: items || [],
    shippingAddress: shippingAddress || null,
    billingAddress: billingAddress || null,
    history: history || []
  };
}

export async function createOrder(orderData: CreateOrderInput) {
  // Start a transaction
  const { data: { user } } = await supabase.auth.getUser();
  
  // Create the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: orderData.customer_id,
      customer_name: orderData.customer_name,
      customer_email: orderData.customer_email,
      payment_status: orderData.payment_status || 'pending',
      fulfillment_status: orderData.fulfillment_status || 'unfulfilled',
      tax: orderData.tax || 0,
      shipping: orderData.shipping || 0,
      discount: orderData.discount || 0,
      notes: orderData.notes,
      created_by: user?.id
    })
    .select()
    .single();
  
  if (orderError) {
    console.error('Error creating order:', orderError);
    throw orderError;
  }
  
  // Create order items
  const orderItems = orderData.items.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    price: item.price,
    total: item.price * item.quantity,
    options: item.options
  }));
  
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);
  
  if (itemsError) {
    console.error('Error creating order items:', itemsError);
    throw itemsError;
  }
  
  // Create shipping address if provided
  if (orderData.shipping_address) {
    const { error: shippingError } = await supabase
      .from('shipping_addresses')
      .insert({
        order_id: order.id,
        ...orderData.shipping_address
      });
    
    if (shippingError) {
      console.error('Error creating shipping address:', shippingError);
      throw shippingError;
    }
  }
  
  // Create billing address if provided
  if (orderData.billing_address) {
    const { error: billingError } = await supabase
      .from('billing_addresses')
      .insert({
        order_id: order.id,
        ...orderData.billing_address
      });
    
    if (billingError) {
      console.error('Error creating billing address:', billingError);
      throw billingError;
    }
  }
  
  // Create initial order history entry
  const { error: historyError } = await supabase
    .from('order_history')
    .insert({
      order_id: order.id,
      status_to: orderData.payment_status || 'pending',
      notes: 'Order created',
      created_by: user?.id
    });
  
  if (historyError) {
    console.error('Error creating order history:', historyError);
    throw historyError;
  }
  
  return order;
}

export async function updateOrderStatus(
  orderId: string, 
  paymentStatus?: string, 
  fulfillmentStatus?: string,
  notes?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get current order status
  const { data: currentOrder, error: fetchError } = await supabase
    .from('orders')
    .select('payment_status, fulfillment_status')
    .eq('id', orderId)
    .single();
  
  if (fetchError) {
    console.error('Error fetching current order status:', fetchError);
    throw fetchError;
  }
  
  const updates: { payment_status?: string; fulfillment_status?: string; notes?: string } = {};
  
  if (paymentStatus) {
    updates.payment_status = paymentStatus;
  }
  
  if (fulfillmentStatus) {
    updates.fulfillment_status = fulfillmentStatus;
  }
  
  if (notes) {
    updates.notes = notes;
  }
  
  const { error: updateError } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId);
  
  if (updateError) {
    console.error('Error updating order status:', updateError);
    throw updateError;
  }
  
  return currentOrder;
}