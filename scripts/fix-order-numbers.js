const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOrderNumbers() {
  console.log('Fixing order number generation...');
  
  try {
    // Drop existing trigger and function
    console.log('Dropping existing trigger and function...');
    await supabase.rpc('exec_sql', { 
      sql: 'DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.orders;' 
    });
    
    await supabase.rpc('exec_sql', { 
      sql: 'DROP FUNCTION IF EXISTS generate_order_number();' 
    });
    
    // Create new function
    console.log('Creating new function...');
    const newFunction = `
      CREATE OR REPLACE FUNCTION generate_order_number()
      RETURNS TRIGGER AS $$
      DECLARE
        max_num INTEGER;
        next_num INTEGER;
      BEGIN
        -- Get the maximum order number, handling both formats
        SELECT COALESCE(
          (SELECT MAX(
            CASE 
              WHEN order_number LIKE 'ORD-%' THEN 
                SUBSTRING(order_number, 5)::integer
              WHEN order_number LIKE '#%' THEN 
                SUBSTRING(order_number, 2)::integer
              ELSE 0
            END
          ) FROM public.orders),
          0
        ) INTO max_num;
        
        -- Generate next number
        next_num := max_num + 1;
        
        -- Format as ORD-XXXXXX
        NEW.order_number := 'ORD-' || LPAD(next_num::text, 6, '0');
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await supabase.rpc('exec_sql', { sql: newFunction });
    
    // Create trigger
    console.log('Creating trigger...');
    await supabase.rpc('exec_sql', { 
      sql: `
        CREATE TRIGGER generate_order_number_trigger
        BEFORE INSERT ON public.orders
        FOR EACH ROW
        WHEN (NEW.order_number IS NULL)
        EXECUTE FUNCTION generate_order_number();
      ` 
    });
    
    console.log('✅ Order number generation fixed');
    
    // Test the fix
    console.log('\nTesting the fix...');
    const testOrder = {
      customer_email: 'test-fix@example.com',
      customer_name: 'Test Fix User',
      payment_status: 'pending',
      fulfillment_status: 'unfulfilled',
      total: 15.00,
      subtotal: 15.00,
      tax: 0,
      shipping: 0,
      discount: 0,
      is_open: true,
      notes: 'Test order after migration fix'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select();
    
    if (insertError) {
      console.error('❌ Test insert failed:', insertError);
    } else {
      console.log('✅ Test insert successful');
      console.log('Generated order number:', insertData[0].order_number);
      
      // Clean up test data
      await supabase
        .from('orders')
        .delete()
        .eq('customer_email', 'test-fix@example.com');
      
      console.log('✅ Cleanup successful');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixOrderNumbers(); 