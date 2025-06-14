"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function CheckoutCanceledPage() {
  const router = useRouter();
  
  return (
    <div className="container max-w-md py-16 text-center">
      <div className="bg-white rounded-lg shadow p-8">
        <AlertCircle className="mx-auto h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Checkout Canceled</h1>
        <p className="text-gray-600 mb-6">
          Your checkout process was canceled. Your cart items have been saved.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/checkout')} 
            variant="outline" 
            className="w-full"
          >
            Return to Checkout
          </Button>
          
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