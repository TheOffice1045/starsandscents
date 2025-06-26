import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '@/lib/email';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Initialize Supabase with service role for webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function GET() {
  return NextResponse.json({ 
    message: 'Stripe webhook endpoint is accessible',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  try {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;
  
  console.log('Body length:', body.length);
  console.log('Signature present:', !!signature);
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('Webhook event type:', event.type);
      console.log('Event ID:', event.id);
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  // Handle different event types
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    try {
        // Log the session ID and basic info
      console.log(`Processing checkout session: ${session.id}`);
        console.log('Session payment status:', session.payment_status);
        console.log('Session payment intent:', session.payment_intent);
      
      // Retrieve the session with line items
        console.log('Retrieving expanded session details...');
      const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items', 'customer_details', 'line_items.data.price.product']
        });

        console.log('Session details:', {
          customerEmail: expandedSession.customer_details?.email,
          lineItems: expandedSession.line_items?.data.length,
          amount: expandedSession.amount_total
        });
      
      const lineItems = expandedSession.line_items?.data || [];
      const customerEmail = expandedSession.customer_details?.email;
      
      if (!customerEmail) {
          console.error('No customer email found in session');
        throw new Error('Customer email not found in session');
      }
      
      // Check if order already exists
        console.log('Checking for existing order...');
      if (session.payment_intent) {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('payment_intent_id', session.payment_intent)
          .maybeSingle();
        
        if (existingOrder) {
          console.log(`Order already exists for payment intent: ${session.payment_intent}`);
          return NextResponse.json({ success: true });
        }
      }
      
      // Create order
        console.log('Creating new order...');
        
        // Generate order number manually
        const { data: lastOrder } = await supabase
          .from('orders')
          .select('order_number')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        let nextOrderNumber = 'ORD-000001';
        if (lastOrder?.order_number) {
          const lastNum = parseInt(lastOrder.order_number.substring(4));
          nextOrderNumber = 'ORD-' + String(lastNum + 1).padStart(6, '0');
        }
        
        // Check for coupon information in session metadata
        const couponCode = session.metadata?.coupon_code;
        const couponId = session.metadata?.coupon_id;
        const discountAmount = session.metadata?.discount_amount ? parseFloat(session.metadata.discount_amount) : 0;

        const orderData = {
          order_number: nextOrderNumber,
          customer_email: expandedSession.customer_details?.email,
          customer_name: expandedSession.customer_details?.name,
          payment_status: expandedSession.payment_status,
          status: expandedSession.payment_status === 'paid' ? 'paid' : 'pending_payment',
          fulfillment_status: 'unfulfilled',
          total: expandedSession.amount_total ? expandedSession.amount_total / 100 : 0,
          subtotal: expandedSession.amount_subtotal ? expandedSession.amount_subtotal / 100 : 0,
          tax: expandedSession.total_details?.amount_tax ? expandedSession.total_details.amount_tax / 100 : 0,
          shipping: expandedSession.total_details?.amount_shipping ? expandedSession.total_details.amount_shipping / 100 : 0,
          discount: discountAmount > 0 ? discountAmount : (expandedSession.total_details?.amount_discount ? expandedSession.total_details.amount_discount / 100 : 0),
          is_open: true,
          payment_intent_id: session.payment_intent,
          notes: `Stripe Checkout Session ID: ${session.id}`
        };
        
        console.log('Order data:', orderData);
        
      const { data: order, error: orderError } = await supabase
        .from('orders')
          .insert(orderData)
        .select()
        .single();
      
      if (orderError) {
        console.error('Error creating order:', orderError);
          throw orderError;
        }
        
        console.log('Order created successfully:', order.id);
        
        // Track coupon usage if coupon was applied
        if (couponId && couponCode && discountAmount > 0) {
          console.log('Recording coupon usage:', { couponCode, couponId, discountAmount });
          
          try {
            // First, try to update the discounts table (existing system)
            const { data: discount, error: discountLookupError } = await supabase
              .from('discounts')
              .select('id, usage_count')
              .eq('id', couponId)
              .single();

            if (discount && !discountLookupError) {
              // Update usage count in discounts table
              const { error: discountUpdateError } = await supabase
                .from('discounts')
                .update({ 
                  usage_count: discount.usage_count + 1,
                  updated_at: new Date().toISOString()
                })
                .eq('id', couponId);
              
              if (discountUpdateError) {
                console.error('Error updating discount usage count:', discountUpdateError);
              } else {
                console.log('Discount usage count updated successfully');
              }
            } else {
              // If not found in discounts table, try coupons table
              const { error: usageError } = await supabase
                .from('coupon_usage')
                .insert({
                  coupon_id: couponId,
                  order_id: order.id,
                  customer_email: expandedSession.customer_details?.email,
                  discount_amount: discountAmount
                });
              
              if (usageError) {
                console.error('Error recording coupon usage:', usageError);
              } else {
                // Update coupon used count
                const { error: updateError } = await supabase.rpc('increment_coupon_usage', {
                  p_coupon_id: couponId
                });
                
                if (updateError) {
                  console.error('Error updating coupon usage count:', updateError);
                } else {
                  console.log('Coupon usage recorded successfully');
                }
              }
            }
          } catch (couponError) {
            console.error('Error processing coupon usage:', couponError);
            // Don't fail the entire webhook if coupon tracking fails
          }
        }
        
        // Create shipping address if available
        if (expandedSession.shipping_details?.address) {
          const shippingAddress = {
            order_id: order.id,
            first_name: expandedSession.shipping_details.name?.split(' ')[0] || '',
            last_name: expandedSession.shipping_details.name?.split(' ').slice(1).join(' ') || '',
            address_line1: expandedSession.shipping_details.address.line1 || '',
            address_line2: expandedSession.shipping_details.address.line2 || '',
            city: expandedSession.shipping_details.address.city || '',
            state: expandedSession.shipping_details.address.state || '',
            postal_code: expandedSession.shipping_details.address.postal_code || '',
            country: expandedSession.shipping_details.address.country || 'United States',
            phone: expandedSession.shipping_details.phone || ''
          };
          
          const { error: shippingError } = await supabase
            .from('shipping_addresses')
            .insert(shippingAddress);
            
          if (shippingError) {
            console.error('Error creating shipping address:', shippingError);
          }
        }
        
        // Create billing address if available
        if (expandedSession.customer_details?.address) {
          const billingAddress = {
            order_id: order.id,
            first_name: expandedSession.customer_details.name?.split(' ')[0] || '',
            last_name: expandedSession.customer_details.name?.split(' ').slice(1).join(' ') || '',
            address_line1: expandedSession.customer_details.address.line1 || '',
            address_line2: expandedSession.customer_details.address.line2 || '',
            city: expandedSession.customer_details.address.city || '',
            state: expandedSession.customer_details.address.state || '',
            postal_code: expandedSession.customer_details.address.postal_code || '',
            country: expandedSession.customer_details.address.country || 'United States',
            phone: expandedSession.customer_details.phone || ''
          };
          
          const { error: billingError } = await supabase
            .from('billing_addresses')
            .insert(billingAddress);
            
          if (billingError) {
            console.error('Error creating billing address:', billingError);
          }
        }
        
        // Create order items and update stock levels
        console.log('Creating order items and updating stock...');
        for (const item of lineItems) {
          console.log('Processing line item:', {
            description: item.description,
            quantity: item.quantity,
            amount_total: item.amount_total
          });
          
          // Get product details
          let productName = item.description || '';
          let productId = null;
          
          if (item.price?.product) {
            const product = typeof item.price.product === 'string' 
              ? await stripe.products.retrieve(item.price.product)
              : item.price.product as Stripe.Product;
              
            productName = product.name;
            productId = product.metadata.product_id; // Get the actual product ID from metadata
          }
          
          if (!productId) {
            console.error('No product ID found for line item:', item);
            continue;
          }

          const orderItem = {
            order_id: order.id,
            product_id: productId,
            product_name: productName,
            quantity: item.quantity || 1,
            price: item.price?.unit_amount ? item.price.unit_amount / 100 : 0,
            total: item.amount_total ? item.amount_total / 100 : 0,
            options: item.price?.metadata || {}
          };
          
          console.log('Creating order item:', orderItem);
          
          const { error: itemError } = await supabase
            .from('order_items')
            .insert(orderItem);
            
          if (itemError) {
            console.error(`Error creating order item: ${itemError.message}`);
            // Don't throw here, continue with other items
          } else {
            console.log('Order item created successfully');
            
            // Update product stock
            const { error: stockError } = await supabase.rpc('update_product_stock', {
              p_product_id: productId,
              p_quantity: item.quantity || 1
            });
            
            if (stockError) {
              console.error(`Error updating stock for product ${productId}:`, stockError);
            } else {
              console.log(`Updated stock for product ${productId}`);
            }
          }
        }
        
        // Create initial order history entry
        const { error: historyError } = await supabase
          .from('order_history')
          .insert({
            order_id: order.id,
            status_from: null,
            status_to: 'unfulfilled',
            notes: 'Order created from Stripe checkout'
          });
          
        if (historyError) {
          console.error('Error creating order history:', historyError);
        }
        
        // Send order confirmation email
        console.log('Sending order confirmation email...');
        try {
          // Ensure we have customer details before sending email
          if (expandedSession.customer_details?.email && expandedSession.customer_details?.name) {
            // Get store settings for store name
            const { data: storeSettings } = await supabase
              .from('store_settings')
              .select('store_name')
              .single();
            
            const storeName = storeSettings?.store_name || 'Candles Store';
            
            // Prepare order items for email
            const emailItems = [];
            for (const item of lineItems) {
              let productName = item.description || '';
              
              if (item.price?.product) {
                const product = typeof item.price.product === 'string' 
                  ? await stripe.products.retrieve(item.price.product)
                  : item.price.product as Stripe.Product;
                  
                productName = product.name;
              }
              
              emailItems.push({
                name: productName,
                quantity: item.quantity || 1,
                price: item.price?.unit_amount ? item.price.unit_amount / 100 : 0
              });
            }
            
            const emailResult = await EmailService.sendOrderConfirmation(
              expandedSession.customer_details.email,
              expandedSession.customer_details.name,
              order.order_number,
              order.total,
              emailItems,
              storeName
            );
            
            if (emailResult.success) {
              console.log('Order confirmation email sent successfully:', emailResult.id);
            } else {
              console.error('Failed to send order confirmation email:', emailResult.error);
            }
          } else {
            console.log('Customer email or name missing, skipping order confirmation email');
          }
        } catch (emailError) {
          console.error('Error sending order confirmation email:', emailError);
          // Don't fail the entire webhook if email fails
        }
        
        console.log(`Order processing completed successfully: ${order.id}`);
        return NextResponse.json({ success: true });
        
    } catch (error) {
      console.error('Error processing checkout session:', error);
        // Return 500 status to trigger webhook retry
        return NextResponse.json(
          { error: 'Error processing checkout session' }, 
          { status: 500 }
        );
    }
  }
  
  // Add handler for payment_intent.succeeded event
  else if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`Payment intent succeeded: ${paymentIntent.id}`);
    
      try {
    // Check if we have an order for this payment intent
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('payment_intent_id', paymentIntent.id)
      .maybeSingle();
    
    if (existingOrder && existingOrder.status !== 'completed') {
      // Update order status to completed
          const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', existingOrder.id);
            
          if (updateError) {
            console.error('Error updating order status:', updateError);
            throw updateError;
          }
      
      console.log(`Updated order status to completed: ${existingOrder.id}`);
        }
        
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Error processing payment intent:', error);
        return NextResponse.json(
          { error: 'Error processing payment intent' },
          { status: 500 }
        );
    }
  }
  
  return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Unhandled error in webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}