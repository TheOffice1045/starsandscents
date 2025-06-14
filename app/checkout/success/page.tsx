"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const { clearCart } = useCartStore();
  
  useEffect(() => {
    // Clear the cart after successful checkout
    clearCart();
    
    // Remove the pending checkout from localStorage
    localStorage.removeItem('pendingCheckout');
  }, [clearCart]);
  
  return (
    <div className="container max-w-md py-16 text-center">
      <div className="bg-white rounded-lg shadow p-8">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Thank You for Your Order!</h1>
        <p className="text-gray-600 mb-6">
          Your payment was successful and your order is being processed.
          You will receive an email confirmation shortly.
        </p>
        
        <div className="space-y-3">
          <Link href="/account?tab=orders">
            <Button variant="outline" className="w-full">
              View Your Orders
            </Button>
          </Link>
          
          <Link href="/">
            <Button className="w-full bg-[#5D4037] hover:bg-[#3E2723] text-white">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}