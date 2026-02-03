"use client";

import { useState, useEffect } from 'react';
import { ShoppingBag, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CartItem as CartItemComponent } from './CartItem';
import { useCartStore } from '@/lib/store/cart';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export function CartSheet() {
  const items = useCartStore((state) => state.items);
  const { getTotalItems, getTotalPrice, clearCart } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    setIsLoading(true);
    try {
      // Create a checkout session on the server
      const checkoutPayload = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price, // Keep as dollars, API will convert to cents
          quantity: item.quantity,
          image: item.image
        }))
      };

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        // Save cart to localStorage before redirecting
        localStorage.setItem('pendingCheckout', JSON.stringify(items));
        
        // Show toast before redirect
        toast.success('Redirecting to checkout...');
        
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(error.message || 'Failed to initiate checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="hover:text-primary relative">
          <ShoppingBag className="w-5 h-5" />
          {mounted && getTotalItems() > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
              {getTotalItems()}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Shopping Cart ({getTotalItems()} items)</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <ScrollArea className="flex-1 -mx-6 px-6">
            {items.length > 0 ? (
              <div className="divide-y">
                {items.map((item) => (
                  <CartItemComponent key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <ShoppingBag className="w-12 h-12 text-gray-400" />
                <p className="mt-4 text-gray-600">Your cart is empty</p>
              </div>
            )}
          </ScrollArea>
          {items.length > 0 && (
            <div className="pt-4 space-y-4">
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${getTotalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>${getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <Button
                  className="w-full bg-[#4A332F] text-white hover:bg-white hover:text-[#4A332F] border border-[#4A332F]"
                  onClick={handleCheckout}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Checkout with Stripe'
                  )}
                </Button>

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">OR</span>
                  </div>
                </div>

                <div className="flex justify-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs flex items-center justify-center border-[#008CFF] text-[#008CFF] hover:bg-[#008CFF] hover:text-white shadow-sm"
                    onClick={() => window.open('https://account.venmo.com/u/StarsScents', '_blank')}
                  >
                    <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.5 3.5h-15c-1.1 0-2 .9-2 2v13c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2v-13c0-1.1-.9-2-2-2zm-8.79 14c-3.03 0-4.71-1.4-4.71-3.2 0-1.42.8-2.78 2.21-3.37.65-.27 1.21-.09 1.64.29.33.3.5.71.5 1.18 0 .26-.08.52-.22.73-.13.21-.3.38-.51.51-.45.26-.91.39-1.37.39-.22 0-.44-.03-.65-.1.19.65.78 1.07 1.5 1.07.41 0 .8-.12 1.13-.35.33-.23.6-.55.77-.93l1.5-5.3c.11-.4.38-.6.7-.6.31 0 .58.2.69.6l2.4 8.2c.05.17.06.34.02.51-.04.17-.13.32-.26.44-.13.12-.28.2-.45.24-.17.04-.34.03-.5-.02-.16-.05-.3-.14-.41-.27-.11-.13-.19-.28-.22-.45l-1.6-5.29-.79 2.63.99 3.35c.05.17.06.34.02.51-.04.17-.13.32-.26.44-.13.12-.28.2-.45.24-.17.04-.34.03-.5-.02-.16-.05-.3-.14-.41-.27-.11-.13-.19-.28-.22-.45l-1.43-4.8c-.33.53-.77.97-1.32 1.28-.54.31-1.16.47-1.78.47z"/>
                    </svg>
                    Venmo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs flex items-center justify-center border-[#6D1ED4] text-[#6D1ED4] hover:bg-[#6D1ED4] hover:text-white shadow-sm"
                    onClick={() => window.open('https://enroll.zellepay.com/qr-codes?data=eyJuYW1lIjoiWUVNSVNJIiwiYWN0aW9uIjoicGF5bWVudCIsInRva2VuIjoiNDQzODI0MTk4MSJ9', '_blank')}
                  >
                    <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.5 3.5h-15c-1.1 0-2 .9-2 2v13c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2v-13c0-1.1-.9-2-2-2zm-7.45 13.98c-2.87 0-5.21-2.34-5.21-5.21 0-2.87 2.34-5.21 5.21-5.21 1.25 0 2.4.44 3.3 1.18l-1.35 1.35c-.51-.36-1.13-.57-1.8-.57-1.73 0-3.14 1.41-3.14 3.14 0 1.73 1.41 3.14 3.14 3.14 1.49 0 2.73-1.04 3.05-2.43h-3.05v-1.78h5.08c.06.33.09.67.09 1.02 0 2.87-2.34 5.21-5.21 5.21z"/>
                    </svg>
                    Zelle
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={clearCart}
                >
                  Clear Cart
                </Button>
              </div>
              <div className="pb-6"></div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
