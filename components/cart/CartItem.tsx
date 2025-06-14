"use client";

import Image from 'next/image';
import { Minus, Plus, X } from 'lucide-react';
import { CartItem as CartItemType } from '@/lib/store/cart';
import { useCartStore } from '@/lib/store/cart';
import { Button } from '@/components/ui/button';
import type { CartItem } from '@/lib/types/cart';

interface CartItemProps {
  item: CartItem;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div className="flex gap-4 py-4">
      <div className="relative w-20 h-20 bg-gray-100">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1">
        <div className="flex justify-between">
          <h3 className="font-medium">{item.name}</h3>
          <button
            onClick={() => removeItem(item.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">${item.price.toFixed(2)}</p>
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 border-[#4A332F] text-[#4A332F] hover:bg-[#4A332F] hover:text-white"
            onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="w-6 text-center text-sm">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 border-[#4A332F] text-[#4A332F] hover:bg-[#4A332F] hover:text-white"
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
