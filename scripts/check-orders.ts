import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkOrders() {
  console.log('Checking recent orders...');
  
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }
  
  if (!orders || orders.length === 0) {
    console.log('No orders found');
    return;
  }
  
  console.log('\nFound', orders.length, 'recent orders:');
  orders.forEach((order, index) => {
    console.log(`\nOrder ${index + 1}:`);
    console.log('ID:', order.id);
    console.log('Customer Email:', order.customer_email);
    console.log('Status:', order.status);
    console.log('Payment Status:', order.payment_status);
    console.log('Created At:', new Date(order.created_at).toLocaleString());
    console.log('Total Amount:', order.total_amount);
    console.log('Items:', order.order_items?.length || 0);
    
    if (order.order_items && order.order_items.length > 0) {
      console.log('\nOrder Items:');
      order.order_items.forEach((item: any) => {
        console.log(`- ${item.quantity}x ${item.name} ($${item.price})`);
      });
    }
  });
}

checkOrders().catch(console.error); 