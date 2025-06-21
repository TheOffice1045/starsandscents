const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findProblematicOrders() {
  console.log('Finding orders with problematic order numbers...');
  
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }
    
    if (!orders || orders.length === 0) {
      console.log('No orders found');
      return;
    }
    
    console.log('\nAll orders:');
    orders.forEach((order, index) => {
      console.log(`${index + 1}. ID: ${order.id}, Order #: ${order.order_number}, Created: ${order.created_at}`);
    });
    
    // Find problematic orders
    const problematic = orders.filter(order => 
      !order.order_number.startsWith('ORD-') && 
      !order.order_number.startsWith('#')
    );
    
    if (problematic.length > 0) {
      console.log('\n🚨 Problematic orders found:');
      problematic.forEach(order => {
        console.log(`- ID: ${order.id}, Order #: ${order.order_number}`);
      });
    } else {
      console.log('\n✅ No problematic orders found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findProblematicOrders(); 