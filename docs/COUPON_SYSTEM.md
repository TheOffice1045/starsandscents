# Coupon System Documentation

## Overview
The coupon system allows customers to apply discount codes during checkout to receive discounts on their orders. The system integrates seamlessly with the existing admin discount management system and supports both percentage-based and fixed-amount discounts with advanced validation rules.

## Features
- ✅ **Admin Panel Integration**: Fully integrated with `/admin/discounts`
- ✅ **Frontend Integration**: Coupon input field on checkout page
- ✅ **Real-time Validation**: Instant feedback when applying coupons
- ✅ **Multiple Discount Types**: Percentage and fixed-amount discounts
- ✅ **Advanced Validation**: Minimum order amounts, usage limits, expiration dates
- ✅ **Stripe Integration**: Discounts appear as Stripe coupons in checkout
- ✅ **Order Tracking**: Coupon usage is tracked automatically
- ✅ **Usage Analytics**: Track usage counts and limits

## Database Schema

The system uses the existing `discounts` table structure:

```sql
-- Existing discounts table (no changes needed)
discounts (
  id UUID PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  max_discount_amount DECIMAL(10, 2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  applies_to VARCHAR(20) DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Creating Coupons

### Via Admin Panel (Recommended)
1. Go to `/admin/discounts`
2. Click "Create Discount"
3. Fill in the coupon details:
   - **Code**: Unique coupon code (e.g., "SAVE20")
   - **Description**: Customer-friendly description
   - **Type**: Percentage or Fixed Amount
   - **Value**: Discount percentage or dollar amount
   - **Min Purchase**: Minimum order amount required
   - **Max Discount**: Maximum discount for percentage coupons
   - **Usage Limit**: How many times it can be used (optional)
   - **Start/End Dates**: When the coupon is valid (optional)

### Sample Coupons Available
The system includes these pre-loaded test coupons:

| Code | Type | Value | Min Order | Max Discount | Description |
|------|------|-------|-----------|--------------|-------------|
| `WELCOME10` | Percentage | 10% | $25 | $50 | 10% off your first order |
| `SAVE5` | Fixed Amount | $5 | $20 | - | $5 off any order |
| `HOLIDAY20` | Percentage | 20% | $50 | $100 | 20% off holiday special |
| `FREESHIP` | Fixed Amount | $10 | $30 | - | Free shipping on orders over $30 |

## API Endpoint

### POST /api/coupons/validate
Validates a coupon code and returns discount information.

**Request:**
```json
{
  "code": "WELCOME10",
  "orderTotal": 50.00,
  "customerEmail": "customer@example.com"
}
```

**Response (Success):**
```json
{
  "valid": true,
  "coupon_id": "uuid-here",
  "discount_amount": 5.00,
  "type": "percentage",
  "value": 10,
  "description": "10% off your first order"
}
```

**Response (Error):**
```json
{
  "valid": false,
  "error": "Minimum order amount of $25 required"
}
```

## Frontend Usage

### Using the useCoupons Hook
```tsx
import { useCoupons } from '@/lib/hooks/useCoupons';

function CheckoutPage() {
  const { 
    validateCoupon, 
    removeCoupon, 
    calculateDiscountedTotal, 
    appliedCoupon, 
    isValidating, 
    error 
  } = useCoupons();

  const handleApplyCoupon = async () => {
    const result = await validateCoupon(couponCode, orderTotal);
    if (result.valid) {
      // Coupon applied successfully
    }
  };

  const finalTotal = calculateDiscountedTotal(originalTotal);
}
```

## Checkout Integration

The coupon system is fully integrated into the checkout flow:

1. **Customer enters coupon code** on checkout page
2. **Real-time validation** shows success/error messages
3. **Order summary updates** to show discount
4. **Stripe checkout** includes discount as a proper Stripe coupon
5. **Order confirmation** tracks coupon usage
6. **Database updates** increment coupon usage count automatically

## Stripe Integration

Coupons are handled in Stripe using their native coupon system:
```javascript
// Dynamic Stripe coupon creation
const stripeCoupon = await stripe.coupons.create({
  amount_off: Math.round(discount_amount * 100), // Convert to cents
  currency: 'usd',
  duration: 'once',
  name: coupon_code,
  metadata: {
    original_coupon_id: coupon_id,
    original_code: coupon_code
  }
});

// Applied to checkout session
sessionData.discounts = [{ coupon: stripeCoupon.id }];
```

## Webhook Processing

The Stripe webhook automatically:
1. Extracts coupon information from session metadata
2. Updates usage count in the discounts table
3. Links coupon usage to the created order
4. Handles both percentage and fixed-amount discounts

## Validation Rules

The system enforces:
- ✅ **Active Status**: Only active coupons can be used
- ✅ **Minimum Order Amount**: Order must meet minimum requirement
- ✅ **Usage Limits**: Prevents over-use of limited coupons
- ✅ **Expiration Dates**: Automatic expiration checking
- ✅ **Start Dates**: Coupons can be scheduled for future activation
- ✅ **Maximum Discount**: Caps percentage-based discounts

## Error Handling

The system provides clear error messages for:
- ✅ **Invalid codes**: "Invalid or inactive coupon code"
- ✅ **Minimum order requirements**: "Minimum order amount of $X required"
- ✅ **Usage limits**: "Coupon usage limit exceeded"  
- ✅ **Expired coupons**: "This coupon has expired"
- ✅ **Future coupons**: "This coupon is not yet active"

## Files Modified/Created

### Core Files
- `lib/hooks/useCoupons.ts` - React hook for coupon functionality
- `app/api/coupons/validate/route.ts` - API endpoint for coupon validation
- `app/checkout/page.tsx` - Updated checkout page with coupon field
- `app/api/checkout/route.ts` - Updated to handle Stripe coupon creation
- `app/api/webhooks/stripe/route.ts` - Updated to track coupon usage

### Database Scripts
- `scripts/add-mock-discounts.js` - Script to add sample coupons

## Management

### Viewing Coupons
- Access all coupons via `/admin/discounts`
- View usage statistics and analytics
- Filter by active/inactive status
- Search by code or description

### Editing Coupons
- Update coupon details directly in admin panel
- Activate/deactivate coupons as needed
- Duplicate existing coupons for variations
- Delete unused coupons

### Analytics
- Track usage counts for each coupon
- Monitor which coupons are most popular
- See total discount amounts given
- Export coupon usage data

## Testing

Test the coupon system by:
1. Going to `/admin/discounts` to view available coupons
2. Adding items to cart (ensure total meets minimum requirements)
3. Going to checkout page
4. Entering any available coupon code
5. Verifying discount is applied correctly
6. Completing checkout to test full integration

## Future Enhancements

Potential improvements:
- Customer-specific coupons
- Category-based discounts
- Automatic coupon suggestions based on cart contents
- A/B testing for different coupon strategies
- Integration with email marketing campaigns
- Bulk coupon generation for promotions 