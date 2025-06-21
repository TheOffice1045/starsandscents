import { useState } from 'react';

interface CouponValidationResult {
  valid: boolean;
  coupon_id?: string;
  discount_amount?: number;
  type?: 'percentage' | 'fixed_amount';
  value?: number;
  description?: string;
  error?: string;
}

export function useCoupons() {
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateCoupon = async (
    code: string,
    orderTotal: number,
    customerEmail?: string
  ): Promise<CouponValidationResult> => {
    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.trim(),
          orderTotal,
          customerEmail,
        }),
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to validate coupon';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If can't parse error, use default message
        }
        
        setError(errorMessage);
        setAppliedCoupon(null);
        return { valid: false, error: errorMessage };
      }

      const result = await response.json();

      if (result.valid) {
        setAppliedCoupon(result);
        setError(null);
      } else {
        setError(result.error || 'Invalid coupon code');
        setAppliedCoupon(null);
      }

      return result;
    } catch (err: any) {
      const errorMessage = 'Network error occurred. Please try again.';
      setError(errorMessage);
      setAppliedCoupon(null);
      return { valid: false, error: errorMessage };
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setError(null);
  };

  const calculateDiscountedTotal = (originalTotal: number): number => {
    if (!appliedCoupon || !appliedCoupon.valid || !appliedCoupon.discount_amount) {
      return originalTotal;
    }
    
    const discountedTotal = originalTotal - appliedCoupon.discount_amount;
    return Math.max(0, discountedTotal); // Ensure total doesn't go below 0
  };

  return {
    validateCoupon,
    removeCoupon,
    calculateDiscountedTotal,
    appliedCoupon,
    isValidating,
    error,
  };
} 