const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function disableTrigger() {
  console.log('Disabling order number generation trigger...');
  
  try {
    // Disable the trigger
    const { error } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.orders DISABLE TRIGGER generate_order_number_trigger;' 
    });
    
    if (error) {
      console.error('Error disabling trigger:', error);
    } else {
      console.log('✅ Trigger disabled successfully');
    }
    
  } catch (error) {
    console.error('❌ Failed to disable trigger:', error);
  }
}

disableTrigger(); 