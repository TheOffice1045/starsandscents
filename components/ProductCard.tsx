"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  price: number;
  oldPrice?: number | null;
  image: string;
  isNew?: boolean;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  };

  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="relative aspect-square bg-gray-50 mb-4">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
        />
        {product.isNew && (
          <span className="absolute top-2 right-2 bg-white px-2 py-1 text-xs font-medium">
            New
          </span>
        )}
        
        {/* Action Icons */}
        <div className="absolute right-2 top-2 flex flex-col gap-2 translate-x-full opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white hover:bg-[#4A332F] hover:text-white"
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white hover:bg-[#4A332F] hover:text-white"
            onClick={(e) => e.preventDefault()}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white hover:bg-[#4A332F] hover:text-white"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <h3 className="font-medium mb-1 group-hover:text-[#4A332F] transition-colors">
        {product.name}
      </h3>
      <div className="flex items-center gap-2">
        <span className="font-medium">${product.price.toFixed(2)}</span>
        {product.oldPrice && (
          <span className="text-sm text-gray-400 line-through">
            ${product.oldPrice.toFixed(2)}
          </span>
        )}
      </div>
    </Link>
  );
}