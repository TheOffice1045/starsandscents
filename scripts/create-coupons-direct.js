const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createCouponsDirectly() {
  console.log('Creating coupon tables directly...');
  
  try {
    // Method 1: Try using rpc to execute raw SQL
    console.log('1. Creating coupons table...');
    const { data: data1, error: error1 } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'coupons')
      .limit(1);
    
    if (error1) {
      console.log('Cannot check existing tables, proceeding with creation...');
    }
    
    // Method 2: Insert test coupon data directly to trigger table creation via admin
    console.log('2. Attempting to create sample coupons...');
    
    const sampleCoupons = [
      {
        code: 'WELCOME10',
        description: '10% off your first order',
        type: 'percentage',
        value: 10.00,
        minimum_order_amount: 25.00,
        maximum_discount_amount: 50.00,
        usage_limit: null,
        used_count: 0,
        is_active: true
      },
      {
        code: 'SAVE5',
        description: '$5 off any order',
        type: 'fixed_amount',
        value: 5.00,
        minimum_order_amount: 20.00,
        maximum_discount_amount: null,
        usage_limit: null,
        used_count: 0,
        is_active: true
      },
      {
        code: 'HOLIDAY20',
        description: '20% off holiday special',
        type: 'percentage',
        value: 20.00,
        minimum_order_amount: 50.00,
        maximum_discount_amount: 100.00,
        usage_limit: 100,
        used_count: 0,
        is_active: true
      },
      {
        code: 'FREESHIP',
        description: 'Free shipping on orders over $30',
        type: 'fixed_amount',
        value: 10.00,
        minimum_order_amount: 30.00,
        maximum_discount_amount: null,
        usage_limit: null,
        used_count: 0,
        is_active: true
      }
    ];

    // Try to insert coupons - this will fail if table doesn't exist
    const { data: insertData, error: insertError } = await supabase
      .from('coupons')
      .insert(sampleCoupons)
      .select();
    
    if (insertError) {
      console.error('Failed to insert coupons:', insertError);
      console.log('\nIt looks like the coupons table needs to be created manually.');
      console.log('Please create the table using the Supabase dashboard or SQL editor with this schema:');
      console.log(`
CREATE TABLE coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed_amount')),
  value DECIMAL(10, 2) NOT NULL CHECK (value > 0),
  minimum_order_amount DECIMAL(10, 2) DEFAULT 0,
  maximum_discount_amount DECIMAL(10, 2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE coupon_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id UUID,
  customer_email VARCHAR(255),
  discount_amount DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
      `);
    } else {
      console.log('✅ Coupons inserted successfully!');
      console.log(`Created ${insertData.length} coupons:`);
      insertData.forEach(coupon => {
        console.log(`- ${coupon.code}: ${coupon.description}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
    console.log('\nPlease create the coupon tables manually using the Supabase dashboard.');
  }
}

createCouponsDirectly(); 