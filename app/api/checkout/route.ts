import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createBrowserClient } from '@supabase/ssr';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, coupon } = body;
    
    // Get the host from request headers
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { message: 'No items provided' },
        { status: 400 }
      );
    }

    // Get the logged-in user's email if available
    let customerEmail = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      customerEmail = user?.email || null;
    } catch (e) {
      // Ignore if not logged in
    }
    // Fallback to email provided in the request body (if you collect it in your checkout form)
    if (!customerEmail && body.email) {
      customerEmail = body.email;
    }

    // Verify stock levels for all items
    for (const item of items) {
      // Validate item has required fields
      if (!item.id) {
        return NextResponse.json(
          { message: 'Invalid cart item: missing product ID' },
          { status: 400 }
        );
      }

      const { data: product } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', item.id)
        .single();

      if (!product) {
        return NextResponse.json(
          { message: `Product not found: ${item.name || item.id}` },
          { status: 400 }
        );
      }

      if (product.quantity < item.quantity) {
        return NextResponse.json(
          { 
            message: `Out of stock! ${item.name}. Available: ${product.quantity}`,
            availableQuantity: product.quantity
          },
          { status: 400 }
        );
      }
    }

    // Prepare line items for Stripe
    const lineItems = items.map((item: any) => {
      // Ensure item has a name, use fallback if missing
      const name = item.name || 'Product';

      // Limit image URL length to avoid URL size issues
      let imageUrl = null;
      if (item.image) {
        // Only use the image if it's not too long
        imageUrl = item.image.length < 500 ? item.image : null;
      }

      // Price should be in dollars - if it's over 1000, it's likely already in cents (old bug)
      // Most products won't cost over $1000, so this is a reasonable sanity check
      let priceInDollars = item.price;
      if (priceInDollars > 1000) {
        // Assume it's already in cents, convert back to dollars
        priceInDollars = priceInDollars / 100;
      }

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: name,
            images: imageUrl ? [imageUrl] : [],
            metadata: {
              product_id: item.id
            }
          },
          unit_amount: Math.round(priceInDollars * 100), // Convert to cents for Stripe
        },
        quantity: item.quantity || 1, // Default to 1 if quantity is missing
      };
    });

    // Prepare checkout session data
    const sessionData: any = {
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB'],
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/canceled`,
      metadata: {
        order_id: `order-${Date.now()}`,
      },
    };

    // Set the customer_email for Stripe session
    if (customerEmail) {
      sessionData.customer_email = customerEmail;
    }

    // Add coupon information to metadata if present
    if (coupon && coupon.discount_amount) {
      sessionData.metadata.coupon_code = coupon.code || '';
      sessionData.metadata.coupon_id = coupon.coupon_id || '';
      sessionData.metadata.discount_amount = coupon.discount_amount.toString();
      
      // Create a Stripe coupon for this discount amount
      try {
        const stripeCoupon = await stripe.coupons.create({
          amount_off: Math.round(coupon.discount_amount * 100), // Convert to cents
          currency: 'usd',
          duration: 'once',
          name: coupon.code || 'Discount',
          metadata: {
            original_coupon_id: coupon.coupon_id || '',
            original_code: coupon.code || ''
          }
        });
        
        // Apply the coupon to the session
        sessionData.discounts = [{
          coupon: stripeCoupon.id
        }];
        
        console.log('Created Stripe coupon:', stripeCoupon.id, 'for discount:', coupon.discount_amount);
      } catch (couponError: any) {
        console.error('Error creating Stripe coupon:', couponError);
        // If coupon creation fails, continue without discount but log the error
        console.log('Proceeding without Stripe coupon, discount will be tracked in metadata only');
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionData);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { message: error.message || 'Error creating checkout session' },
      { status: 500 }
    );
  }
}