"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart";
import type { CartItem } from "@/lib/types/cart";
import { CartItem as CartItemComponent } from "./CartItem";
import { X } from "lucide-react";
import { toast } from "sonner";

export function CartSheet({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  
  // Calculate total price
  const totalPrice = items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  const handleCheckout = async () => {
    if (items.length === 0) {
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
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: Math.round(item.price * 100), // Convert to cents for Stripe
            quantity: item.quantity,
            image: item.image
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        // Save cart to localStorage before redirecting
        localStorage.setItem('pendingCheckout', JSON.stringify(items));
        
        // Close the cart sheet
        setIsOpen(false);
        
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
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col h-full">
        <SheetHeader className="flex justify-between items-center">
          <SheetTitle>Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})</SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <CartItemComponent key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-4">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          
          <div className="flex justify-between font-medium mb-4">
            <span>Total</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
          
          <Button 
            onClick={handleCheckout} 
            className="w-full bg-[#5D4037] hover:bg-[#3E2723] text-white" 
            disabled={items.length === 0 || isLoading}
          >
            {isLoading ? 'Processing...' : 'Checkout'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}