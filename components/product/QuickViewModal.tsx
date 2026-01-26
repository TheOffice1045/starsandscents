"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Product } from "@/lib/types";
import Image from "next/image";
import { Button } from "../ui/button";
import { useState } from "react";
import { useCartStore } from "@/lib/store/cart";
import { X } from "lucide-react";

interface QuickViewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const [selectedSize, setSelectedSize] = useState("L");
  const [selectedColor, setSelectedColor] = useState("black");
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name || product.title || '',
      price: product.price || 0,
      image: product.image || product.images?.[0]?.url || '',
      stock: product.quantity || 0,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] p-0">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="grid grid-cols-2">
          {/* Product Images */}
          <div className="p-6">
            <div className="relative aspect-square bg-gray-100 mb-4">
              <Image
                src={product.image || ''}
                alt={product.name || ''}
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((num) => (
                <div key={num} className="relative aspect-square bg-gray-100">
                  <Image
                    src={product.image || ''}
                    alt={`${product.name || ''} view ${num}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="p-6">
            <h2 className="text-2xl font-medium mb-2">{product.name || ''}</h2>
            <p className="text-xl mb-4">${product.price.toFixed(2)} USD</p>
            
            <p className="text-gray-600 mb-6">{product.description}</p>

            {/* Size Selection */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">SIZE</h3>
              <div className="flex gap-2">
                {["L", "XL"].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 border ${
                      selectedSize === size
                        ? "border-[#4A332F] text-[#4A332F]"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">COLOR</h3>
              <div className="flex gap-2">
                {[
                  { name: "black", class: "bg-black" },
                  { name: "green", class: "bg-green-600" },
                ].map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`w-6 h-6 rounded-full ${color.class} ${
                      selectedColor === color.name ? "ring-2 ring-offset-2 ring-[#4A332F]" : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="flex gap-4">
              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded"
                />
              </div>
              <Button
                onClick={handleAddToCart}
                className="flex-1 bg-[#4A332F] text-white hover:bg-[#3A231F]"
              >
                ADD TO CART
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
