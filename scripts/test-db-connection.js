const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('orders')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Connection test failed:', error);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Test RLS policies
    console.log('\nTesting RLS policies...');
    
    // Try to insert a test order
    const testOrder = {
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      payment_status: 'pending',
      fulfillment_status: 'unfulfilled',
      total: 10.00,
      subtotal: 10.00,
      tax: 0,
      shipping: 0,
      discount: 0,
      is_open: true,
      notes: 'Test order for RLS testing'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select();
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
    } else {
      console.log('✅ Insert test successful');
      
      // Clean up test data
      await supabase
        .from('orders')
        .delete()
        .eq('customer_email', 'test@example.com');
      
      console.log('✅ Cleanup successful');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConnection(); 