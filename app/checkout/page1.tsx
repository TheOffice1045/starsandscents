"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { useCoupons } from "@/lib/hooks/useCoupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShoppingBag, CreditCard, Info, Truck, Tag, X, Check, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items: cart, updateQuantity, removeFromCart } = useCartStore();
  const clearCart = useCartStore((state) => state.clearCart);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  
  // Coupon functionality
  const { validateCoupon, removeCoupon, calculateDiscountedTotal, appliedCoupon, isValidating, error: couponError } = useCoupons();
  
  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
    // Clear the cart on initial load to prevent stale data
    clearCart();
  }, [clearCart]);
  
  // Calculate total price
  const totalPrice = cart?.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0) || 0;

  // Calculate final total with discount
  const finalTotal = calculateDiscountedTotal(totalPrice);

  useEffect(() => {
    // Only run this effect on the client side
    if (isClient && (!cart || cart.length === 0)) {
      toast.error("Your cart is empty");
      router.push("/");
    }
  }, [cart, router, isClient]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    const result = await validateCoupon(couponCode, totalPrice);
    
    if (result.valid) {
      toast.success(`Coupon applied! You saved $${result.discount_amount?.toFixed(2)}`);
      setCouponCode(""); // Clear the input
    } else {
      toast.error(result.error || "Invalid coupon code");
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponCode("");
    toast.success("Coupon removed");
  };

  const handleCheckout = async () => {
    if (!cart || cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    setIsLoading(true);
    try {
      // Create a checkout session on the server
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price, // Keep as dollars, API will convert to cents
            quantity: item.quantity,
            image: item.image
          })),
          notes: orderNotes,
          coupon: appliedCoupon ? {
            code: appliedCoupon.description || 'Discount Applied',
            discount_amount: appliedCoupon.discount_amount,
            coupon_id: appliedCoupon.coupon_id
          } : null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        // Save cart to localStorage before redirecting
        localStorage.setItem('pendingCheckout', JSON.stringify(cart));
        
        // Show toast before redirect
        toast.success('Redirecting to secure payment...');
        
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(error.message || 'Failed to initiate checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state until client-side rendering is complete
  if (!isClient) {
    return (
      <div className="container max-w-6xl py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Show empty cart message if cart is empty
  if (!cart || cart.length === 0) {
    return (
      <div className="container max-w-6xl py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#5D4037] to-[#3E2723] p-6 text-white">
            <h1 className="text-2xl font-semibold">Checkout</h1>
          </div>
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 text-amber-500 mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-medium mb-3">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add some products to your cart before checking out.</p>
            <Button asChild className="bg-[#5D4037] hover:bg-[#3E2723] text-white">
              <Link href="/shop">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-10 px-4 sm:px-6 bg-gray-50 min-h-screen">
      <div className="mb-8 text-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="mt-2 text-gray-600">Complete your purchase securely</p>
      </div>
      
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Main Content - Order Items & Notes */}
        <div className="lg:col-span-7 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="border-b border-gray-200 bg-gradient-to-r from-[#5D4037]/5 to-white">
              <div className="flex items-center p-6">
                <ShoppingBag className="h-5 w-5 text-[#5D4037] mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Your Items</h2>
                <div className="ml-auto bg-[#5D4037]/10 text-[#5D4037] text-sm font-medium rounded-full px-3 py-1">
                  {cart.reduce((total, item) => total + item.quantity, 0)} items
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {cart.map((item) => (
                <div key={item.id} className="p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  {item.image && (
                    <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 truncate">{item.name}</h3>
                    <div className="mt-2 flex items-center">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(String(item.id), item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(String(item.id), item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-end justify-between h-full">
                    <p className="text-base font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8"
                      onClick={() => removeFromCart(String(item.id))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Order Notes */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="border-b border-gray-200 bg-gradient-to-r from-[#5D4037]/5 to-white">
              <div className="flex items-center p-6">
                <Info className="h-5 w-5 text-[#5D4037] mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Order Notes</h2>
              </div>
            </div>
            
            <div className="p-6">
              <textarea 
                className="w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D4037] focus:border-transparent transition-all"
                rows={4}
                placeholder="Add any special instructions or notes about your order here..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
              <div className="mt-3 flex items-start">
                <Truck className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-gray-500">
                  Shipping details will be collected on the payment page.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Order Summary & Payment */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-6 border border-gray-100">
            <div className="border-b border-gray-200 bg-gradient-to-r from-[#5D4037]/5 to-white">
              <div className="flex items-center p-6">
                <CreditCard className="h-5 w-5 text-[#5D4037] mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Coupon Section */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <Tag className="h-4 w-4 text-[#5D4037] mr-2" />
                  <h3 className="text-sm font-medium text-gray-900">Promo Code</h3>
                </div>
                
                {appliedCoupon ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            Coupon Applied
                          </p>
                          <p className="text-xs text-green-600">
                            {appliedCoupon.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCoupon}
                        className="text-green-600 hover:text-green-800 hover:bg-green-100 p-1"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={isValidating || !couponCode.trim()}
                      className="text-[#5D4037] border-[#5D4037] hover:bg-[#5D4037] hover:text-white"
                    >
                      {isValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </Button>
                  </div>
                )}
                
                {couponError && (
                  <p className="text-xs text-red-600 mt-1">{couponError}</p>
                )}
              </div>

              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">${totalPrice.toFixed(2)}</span>
                </div>
                
                {appliedCoupon && appliedCoupon.discount_amount && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">-${appliedCoupon.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-gray-600">
                  <span>Shipping</span>
                  <span className="text-sm text-gray-500">Calculated at next step</span>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">${finalTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 text-right mt-1">Tax included where applicable</p>
                </div>
              </div>
              
              <Button 
                onClick={handleCheckout} 
                className="w-full bg-[#5D4037] hover:bg-[#3E2723] text-white hover:text-[#FFFFFF] py-6 rounded-lg transition-colors duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Proceed to Payment
                  </>
                )}
              </Button>
              
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center mb-3 bg-gray-50 p-3 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-sm text-gray-500">
                    Secure payment powered by Stripe
                  </p>
                </div>
                
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">OR</span>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-3 mb-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs flex items-center border-[#008CFF] text-[#008CFF] hover:bg-[#008CFF] hover:text-white shadow-sm"
                    onClick={() => window.open('https://account.venmo.com/u/StarsScents', '_blank')}
                  >
                    <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.5 3.5h-15c-1.1 0-2 .9-2 2v13c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2v-13c0-1.1-.9-2-2-2zm-8.79 14c-3.03 0-4.71-1.4-4.71-3.2 0-1.42.8-2.78 2.21-3.37.65-.27 1.21-.09 1.64.29.33.3.5.71.5 1.18 0 .26-.08.52-.22.73-.13.21-.3.38-.51.51-.45.26-.91.39-1.37.39-.22 0-.44-.03-.65-.1.19.65.78 1.07 1.5 1.07.41 0 .8-.12 1.13-.35.33-.23.6-.55.77-.93l1.5-5.3c.11-.4.38-.6.7-.6.31 0 .58.2.69.6l2.4 8.2c.05.17.06.34.02.51-.04.17-.13.32-.26.44-.13.12-.28.2-.45.24-.17.04-.34.03-.5-.02-.16-.05-.3-.14-.41-.27-.11-.13-.19-.28-.22-.45l-1.6-5.29-.79 2.63.99 3.35c.05.17.06.34.02.51-.04.17-.13.32-.26.44-.13.12-.28.2-.45.24-.17.04-.34.03-.5-.02-.16-.05-.3-.14-.41-.27-.11-.13-.19-.28-.22-.45l-1.43-4.8c-.33.53-.77.97-1.32 1.28-.54.31-1.16.47-1.78.47z"/>
                    </svg>
                    Pay with Venmo
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs flex items-center border-[#6D1ED4] text-[#6D1ED4] hover:bg-[#6D1ED4] hover:text-white shadow-sm"
                    onClick={() => window.open('https://enroll.zellepay.com/qr-codes?data=eyJuYW1lIjoiWUVNSVNJIiwiYWN0aW9uIjoicGF5bWVudCIsInRva2VuIjoiNDQzODI0MTk4MSJ9', '_blank')}
                  >
                    <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.5 3.5h-15c-1.1 0-2 .9-2 2v13c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2v-13c0-1.1-.9-2-2-2zm-7.45 13.98c-2.87 0-5.21-2.34-5.21-5.21 0-2.87 2.34-5.21 5.21-5.21 1.25 0 2.4.44 3.3 1.18l-1.35 1.35c-.51-.36-1.13-.57-1.8-.57-1.73 0-3.14 1.41-3.14 3.14 0 1.73 1.41 3.14 3.14 3.14 1.49 0 2.73-1.04 3.05-2.43h-3.05v-1.78h5.08c.06.33.09.67.09 1.02 0 2.87-2.34 5.21-5.21 5.21z"/>
                    </svg>
                    Pay with Zelle
                  </Button>
                </div>
                
               
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}