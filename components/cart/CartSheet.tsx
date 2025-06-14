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
          price: Math.round(item.price * 100), // Convert to cents for Stripe
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
                    'Checkout'
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearCart}
                >
                  Clear Cart
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
