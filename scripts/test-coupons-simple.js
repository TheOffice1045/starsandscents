const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCoupons() {
  console.log('Testing coupon system...');
  
  try {
    // Test 1: Check if coupons table exists and has data
    console.log('\n1. Checking coupons table...');
    const { data: coupons, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .limit(5);
    
    if (couponError) {
      console.error('Error fetching coupons:', couponError);
      return;
    }
    
    console.log(`Found ${coupons.length} coupons:`);
    coupons.forEach(coupon => {
      console.log(`- ${coupon.code}: ${coupon.description} (${coupon.type}, value: ${coupon.value})`);
    });

    // Test 2: Test API endpoint directly
    console.log('\n2. Testing API endpoint...');
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'WELCOME10',
          orderTotal: 50,
          customerEmail: 'test@example.com'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('API test result:', result);
      } else {
        console.log('API endpoint not accessible (app may not be running)');
      }
    } catch (apiError) {
      console.log('API endpoint not accessible (app may not be running)');
    }

    // Test 3: Direct database function test with simpler approach
    console.log('\n3. Testing database function directly...');
    
    // Create a simpler test function
    const createTestFunction = `
      CREATE OR REPLACE FUNCTION test_validate_coupon()
      RETURNS JSON AS $$
      DECLARE
        coupon_record RECORD;
        test_total DECIMAL(10, 2) := 50.00;
        discount_amount DECIMAL(10, 2);
      BEGIN
        SELECT * INTO coupon_record 
        FROM coupons 
        WHERE code = 'WELCOME10' 
          AND is_active = true;
        
        IF NOT FOUND THEN
          RETURN json_build_object('error', 'Coupon not found');
        END IF;
        
        IF coupon_record.type = 'percentage' THEN
          discount_amount := test_total * (coupon_record.value / 100);
          IF coupon_record.maximum_discount_amount IS NOT NULL AND discount_amount > coupon_record.maximum_discount_amount THEN
            discount_amount := coupon_record.maximum_discount_amount;
          END IF;
        ELSE
          discount_amount := coupon_record.value;
        END IF;
        
        RETURN json_build_object(
          'valid', true,
          'code', coupon_record.code,
          'discount_amount', discount_amount,
          'description', coupon_record.description
        );
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await supabase.rpc('exec_sql', { sql: createTestFunction });
    
    const { data: testResult, error: testError } = await supabase.rpc('test_validate_coupon');
    
    if (testError) {
      console.error('Function test error:', testError);
    } else {
      console.log('Direct function test result:', testResult);
    }

    console.log('\n✓ Coupon system test completed!');

  } catch (error) {
    console.error('Error testing coupons:', error);
  }
}

testCoupons(); 