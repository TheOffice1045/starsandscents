import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body;
    
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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB'],
      },
      line_items: items.map((item: any) => {
        // Ensure item has a name, use fallback if missing
        const name = item.name || 'Product';
        
        // Limit image URL length to avoid URL size issues
        let imageUrl = null;
        if (item.image) {
          // Only use the image if it's not too long
          imageUrl = item.image.length < 500 ? item.image : null;
        }
        
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: name,
              images: imageUrl ? [imageUrl] : [],
            },
            unit_amount: Math.round(item.price), // Ensure it's an integer
          },
          quantity: item.quantity || 1, // Default to 1 if quantity is missing
        };
      }),
      mode: 'payment',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/canceled`,
      metadata: {
        order_id: `order-${Date.now()}`,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { message: error.message || 'Error creating checkout session' },
      { status: 500 }
    );
  }
}