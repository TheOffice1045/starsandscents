const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrderNumbers() {
  console.log('Checking existing order numbers...');
  
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }
    
    if (!orders || orders.length === 0) {
      console.log('No orders found');
      return;
    }
    
    console.log('\nRecent orders:');
    orders.forEach((order, index) => {
      console.log(`${index + 1}. ID: ${order.id}, Order #: ${order.order_number}, Created: ${order.created_at}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkOrderNumbers(); 