const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixCouponFunction() {
  console.log('Fixing coupon validation function...');
  
  try {
    // Drop and recreate the function with correct syntax
    const fixFunction = `
      DROP FUNCTION IF EXISTS validate_coupon(VARCHAR, DECIMAL, VARCHAR);
      
      CREATE OR REPLACE FUNCTION validate_coupon(
        coupon_code VARCHAR(50),
        order_total DECIMAL(10, 2),
        customer_email VARCHAR(255) DEFAULT NULL
      ) RETURNS JSON AS $$
      DECLARE
        coupon_record RECORD;
        discount_amount DECIMAL(10, 2);
        usage_count INTEGER;
      BEGIN
        -- Get coupon details
        SELECT * INTO coupon_record 
        FROM coupons 
        WHERE code = coupon_code 
          AND is_active = true 
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (expires_at IS NULL OR expires_at > NOW());
        
        -- Check if coupon exists
        IF NOT FOUND THEN
          RETURN json_build_object(
            'valid', false,
            'error', 'Invalid or expired coupon code'
          );
        END IF;
        
        -- Check minimum order amount
        IF order_total < coupon_record.minimum_order_amount THEN
          RETURN json_build_object(
            'valid', false,
            'error', 'Minimum order amount of $' || coupon_record.minimum_order_amount || ' required'
          );
        END IF;
        
        -- Check usage limit
        IF coupon_record.usage_limit IS NOT NULL THEN
          SELECT used_count INTO usage_count FROM coupons WHERE id = coupon_record.id;
          IF usage_count >= coupon_record.usage_limit THEN
            RETURN json_build_object(
              'valid', false,
              'error', 'Coupon usage limit exceeded'
            );
          END IF;
        END IF;
        
        -- Calculate discount amount
        IF coupon_record.type = 'percentage' THEN
          discount_amount := order_total * (coupon_record.value / 100);
          -- Apply maximum discount limit if set
          IF coupon_record.maximum_discount_amount IS NOT NULL AND discount_amount > coupon_record.maximum_discount_amount THEN
            discount_amount := coupon_record.maximum_discount_amount;
          END IF;
        ELSE -- fixed_amount
          discount_amount := coupon_record.value;
          -- Don't allow discount to exceed order total
          IF discount_amount > order_total THEN
            discount_amount := order_total;
          END IF;
        END IF;
        
        -- Return valid coupon with discount details
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
    
    await supabase.rpc('exec_sql', { sql: fixFunction });
    console.log('✓ Coupon validation function fixed');

    // Test the function
    console.log('Testing the function...');
    const { data: testResult } = await supabase.rpc('validate_coupon', {
      coupon_code: 'WELCOME10',
      order_total: 50.00,
      customer_email: 'test@example.com'
    });
    
    console.log('Test result:', testResult);
    console.log('✓ Function is working correctly');

  } catch (error) {
    console.error('Error fixing coupon function:', error);
    process.exit(1);
  }
}

fixCouponFunction(); 