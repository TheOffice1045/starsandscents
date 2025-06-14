import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  // Handle different event types
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Inside the checkout.session.completed handler
    try {
      // Log the session ID for debugging
      console.log(`Processing checkout session: ${session.id}`);
      
      // Retrieve the session with line items
      const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items', 'customer_details']
      });

      console.log(`Customer email from session: ${expandedSession.customer_details?.email}`);
      
      const lineItems = expandedSession.line_items?.data || [];
      const customerEmail = expandedSession.customer_details?.email;
      
      if (!customerEmail) {
        throw new Error('Customer email not found in session');
      }
      
      // Get or create customer
      let customerData = null;
      if (expandedSession.customer_details?.email) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('email', expandedSession.customer_details.email)
          .single();

        if (existingCustomer) {
          customerData = existingCustomer;
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              email: expandedSession.customer_details.email,
              name: expandedSession.customer_details.name || null,
              phone: expandedSession.customer_details.phone || null,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (customerError) {
            console.error('Error creating customer:', customerError);
            return new NextResponse('Error creating customer', { status: 500 });
          }

          customerData = newCustomer;
        }
      }
      
      // Check if order already exists
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
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerData?.id || null,
          email: expandedSession.customer_details?.email || null,
          name: expandedSession.customer_details?.name || null,
          phone: expandedSession.customer_details?.phone || null,
          total_amount: expandedSession.amount_total ? expandedSession.amount_total / 100 : 0,
          currency: expandedSession.currency?.toUpperCase() || 'USD',
          status: 'completed',
          payment_status: 'paid',
          payment_method: 'stripe',
          payment_id: session.payment_intent,
          shipping_address: expandedSession.shipping_details?.address || null,
          billing_address: expandedSession.customer_details?.address || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (orderError) {
        console.error('Error creating order:', orderError);
        return new NextResponse('Error creating order', { status: 500 });
      }
      
      // Create order items
      for (const item of lineItems) {
        let productId = null;
        let productName = item.description || '';
        
        // Try to get product details from expanded data
        if (typeof item.price?.product === 'object') {
          const product = item.price.product as Stripe.Product;
          
          // Try to find product in our database
          const { data: productData } = await supabase
            .from('products')
            .select('id, name')
            .eq('stripe_product_id', product.id)
            .maybeSingle();
          
          if (productData) {
            productId = productData.id;
            productName = productData.name;
          }
        }
        
        // Add better error handling for order items
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: productId,
            stripe_product_id: typeof item.price?.product === 'string' 
              ? item.price.product 
              : (item.price?.product as Stripe.Product)?.id,
            quantity: item.quantity || 1,
            price: item.amount_total ? item.amount_total / 100 : 0,
            name: productName,
            // Add metadata field if you added it to your schema
            metadata: item.price?.metadata || {},
          });
          
        if (itemError) {
          console.error(`Error creating order item: ${itemError.message}`);
        }
      }
      
      console.log(`Order created successfully: ${order.id}`);
      // After creating the order
      console.log(`Order created with ID: ${order.id} for customer: ${customerData?.id}`);
    } catch (error) {
      console.error('Error processing checkout session:', error);
      return NextResponse.json({ error: 'Error processing checkout session' }, { status: 500 });
    }
  }
  
  // Add handler for payment_intent.succeeded event
  else if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`Payment intent succeeded: ${paymentIntent.id}`);
    
    // Check if we have an order for this payment intent
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('payment_intent_id', paymentIntent.id)
      .maybeSingle();
    
    if (existingOrder && existingOrder.status !== 'completed') {
      // Update order status to completed
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', existingOrder.id);
      
      console.log(`Updated order status to completed: ${existingOrder.id}`);
    }
  }
  
  return NextResponse.json({ received: true });
}