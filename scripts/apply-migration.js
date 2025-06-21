const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('Applying order number generation fix...');
  
  try {
    // Read the migration SQL
    const migrationSQL = fs.readFileSync('supabase/migrations/20240505000000_fix_order_number_generation.sql', 'utf8');
    
    // Split into individual statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error('Error executing statement:', error);
          console.error('Statement:', statement);
          return;
        }
      }
    }
    
    console.log('✅ Migration applied successfully');
    
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
    console.error('❌ Migration failed:', error);
  }
}

applyMigration(); 