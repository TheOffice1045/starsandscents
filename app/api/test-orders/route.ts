import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get all orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*), customers(email)')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Error fetching orders:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}