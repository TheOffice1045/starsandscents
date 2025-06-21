import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { code, orderTotal, customerEmail } = await request.json();

    if (!code || !orderTotal) {
      return NextResponse.json(
        { error: 'Coupon code and order total are required' },
        { status: 400 }
      );
    }

    console.log('Validating coupon:', { code, orderTotal, customerEmail });

    // Look up coupon in the discounts table
    try {
      const { data: discount, error: discountError } = await supabase
        .from('discounts')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (discount && !discountError) {
        console.log('Found discount in discounts table:', discount);
        
        // Validate discount conditions
        if (orderTotal < discount.min_purchase_amount) {
          return NextResponse.json({
            valid: false,
            error: `Minimum order amount of $${discount.min_purchase_amount} required`
          });
        }

        // Check usage limit
        if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
          return NextResponse.json({
            valid: false,
            error: 'Coupon usage limit exceeded'
          });
        }

        // Check expiration
        if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
          return NextResponse.json({
            valid: false,
            error: 'This coupon has expired'
          });
        }

        // Check start date
        if (discount.starts_at && new Date(discount.starts_at) > new Date()) {
          return NextResponse.json({
            valid: false,
            error: 'This coupon is not yet active'
          });
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (discount.discount_type === 'percentage') {
          discountAmount = orderTotal * (discount.discount_value / 100);
          if (discount.max_discount_amount && discountAmount > discount.max_discount_amount) {
            discountAmount = discount.max_discount_amount;
          }
        } else {
          discountAmount = discount.discount_value;
          if (discountAmount > orderTotal) {
            discountAmount = orderTotal;
          }
        }

        const result = {
          valid: true,
          coupon_id: discount.id,
          discount_amount: discountAmount,
          type: discount.discount_type === 'fixed_amount' ? 'fixed_amount' : 'percentage',
          value: discount.discount_value,
          description: discount.description || `${discount.code} discount`
        };

        console.log('Discount validation result:', result);
        return NextResponse.json(result);
      } else {
        return NextResponse.json({
          valid: false,
          error: 'Invalid or inactive coupon code'
        });
      }
    } catch (discountLookupError: any) {
      console.error('Error looking up discount:', discountLookupError);
      return NextResponse.json({
        valid: false,
        error: 'Failed to validate coupon'
      });
    }

  } catch (error: any) {
    console.error('Coupon validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 