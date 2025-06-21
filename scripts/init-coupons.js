const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function initCoupons() {
  console.log('Initializing coupon tables...');
  
  try {
    // Create coupons table
    const createCouponsTable = `
      CREATE TABLE IF NOT EXISTS coupons (
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
    `;
    
    await supabase.rpc('exec_sql', { sql: createCouponsTable });
    console.log('✓ Coupons table created');

    // Create coupon usage table
    const createUsageTable = `
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
        order_id UUID,
        customer_email VARCHAR(255),
        discount_amount DECIMAL(10, 2) NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await supabase.rpc('exec_sql', { sql: createUsageTable });
    console.log('✓ Coupon usage table created');

    // Create indexes
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
      CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
      CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at);
      CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
      CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer_email ON coupon_usage(customer_email);
    `;
    
    await supabase.rpc('exec_sql', { sql: createIndexes });
    console.log('✓ Indexes created');

    // Enable RLS
    const enableRLS = `
      ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
      ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
    `;
    
    await supabase.rpc('exec_sql', { sql: enableRLS });
    console.log('✓ Row Level Security enabled');

    // Create RLS policies
    const createPolicies = `
      DROP POLICY IF EXISTS "Anyone can read active coupons" ON coupons;
      CREATE POLICY "Anyone can read active coupons" 
      ON coupons 
      FOR SELECT 
      USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

      DROP POLICY IF EXISTS "Service role can manage coupons" ON coupons;
      CREATE POLICY "Service role can manage coupons" 
      ON coupons 
      FOR ALL 
      TO service_role 
      USING (true);

      DROP POLICY IF EXISTS "Service role can manage coupon usage" ON coupon_usage;
      CREATE POLICY "Service role can manage coupon usage" 
      ON coupon_usage 
      FOR ALL 
      TO service_role 
      USING (true);
    `;
    
    await supabase.rpc('exec_sql', { sql: createPolicies });
    console.log('✓ RLS policies created');

    // Create validation function
    const createFunction = `
      CREATE OR REPLACE FUNCTION validate_coupon(
        coupon_code VARCHAR(50),
        order_total DECIMAL(10, 2),
        customer_email VARCHAR(255) DEFAULT NULL
      ) RETURNS JSON AS $$
      DECLARE
        coupon_record coupons%ROWTYPE;
        discount_amount DECIMAL(10, 2);
        usage_count INTEGER;
        result JSON;
      BEGIN
        SELECT * INTO coupon_record 
        FROM coupons 
        WHERE code = coupon_code 
          AND is_active = true 
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (expires_at IS NULL OR expires_at > NOW());
        
        IF NOT FOUND THEN
          RETURN json_build_object(
            'valid', false,
            'error', 'Invalid or expired coupon code'
          );
        END IF;
        
        IF order_total < coupon_record.minimum_order_amount THEN
          RETURN json_build_object(
            'valid', false,
            'error', format('Minimum order amount of $%.2f required', coupon_record.minimum_order_amount)
          );
        END IF;
        
        IF coupon_record.usage_limit IS NOT NULL THEN
          SELECT used_count INTO usage_count FROM coupons WHERE id = coupon_record.id;
          IF usage_count >= coupon_record.usage_limit THEN
            RETURN json_build_object(
              'valid', false,
              'error', 'Coupon usage limit exceeded'
            );
          END IF;
        END IF;
        
        IF coupon_record.type = 'percentage' THEN
          discount_amount := order_total * (coupon_record.value / 100);
          IF coupon_record.maximum_discount_amount IS NOT NULL AND discount_amount > coupon_record.maximum_discount_amount THEN
            discount_amount := coupon_record.maximum_discount_amount;
          END IF;
        ELSE
          discount_amount := coupon_record.value;
          IF discount_amount > order_total THEN
            discount_amount := order_total;
          END IF;
        END IF;
        
        RETURN json_build_object(
          'valid', true,
          'coupon_id', coupon_record.id,
          'discount_amount', discount_amount,
          'type', coupon_record.type,
          'value', coupon_record.value,
          'description', coupon_record.description
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    await supabase.rpc('exec_sql', { sql: createFunction });
    console.log('✓ Validation function created');

    // Create increment function
    const createIncrementFunction = `
      CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id UUID)
      RETURNS VOID AS $$
      BEGIN
        UPDATE coupons 
        SET used_count = used_count + 1,
            updated_at = NOW()
        WHERE id = p_coupon_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    await supabase.rpc('exec_sql', { sql: createIncrementFunction });
    console.log('✓ Increment function created');

    // Insert sample coupons
    const insertSampleCoupons = `
      INSERT INTO coupons (code, description, type, value, minimum_order_amount, maximum_discount_amount, usage_limit) VALUES
      ('WELCOME10', '10% off your first order', 'percentage', 10.00, 25.00, 50.00, NULL),
      ('SAVE5', '$5 off any order', 'fixed_amount', 5.00, 20.00, NULL, NULL),
      ('HOLIDAY20', '20% off holiday special', 'percentage', 20.00, 50.00, 100.00, 100),
      ('FREESHIP', 'Free shipping on orders over $30', 'fixed_amount', 10.00, 30.00, NULL, NULL)
      ON CONFLICT (code) DO NOTHING;
    `;
    
    await supabase.rpc('exec_sql', { sql: insertSampleCoupons });
    console.log('✓ Sample coupons inserted');

    console.log('\n🎉 Coupon system initialized successfully!');
    console.log('\nAvailable test coupons:');
    console.log('- WELCOME10: 10% off (min $25, max $50 discount)');
    console.log('- SAVE5: $5 off (min $20)');
    console.log('- HOLIDAY20: 20% off (min $50, max $100 discount, limited to 100 uses)');
    console.log('- FREESHIP: $10 off (min $30, simulates free shipping)');

  } catch (error) {
    console.error('Error initializing coupons:', error);
    process.exit(1);
  }
}

initCoupons(); 