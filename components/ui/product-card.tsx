import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useWishlistStore } from "@/lib/store/wishlist";
import { toast } from "sonner";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    price: number;
    compare_at_price?: number;
    image?: string;
    quantity: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Connect to wishlist store
  const { addItem, removeItem, isInWishlist } = useWishlistStore((state) => ({
    addItem: state.addItem,
    removeItem: state.removeItem,
    isInWishlist: state.isInWishlist
  }));
  
  // Check if product is in wishlist
  const inWishlist = isInWishlist(product.id);
  
  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (inWishlist) {
      removeItem(product.id);
      toast.success('Removed from wishlist');
    } else {
      addItem({
        id: product.id,
        name: product.title,
        price: product.price,
        image: product.image || '',
      });
      toast.success('Added to wishlist');
    }
  };
  
  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : null;

  return (
    <Link 
      href={`/products/${product.id}`} 
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-square bg-gray-100 rounded-md overflow-hidden mb-3">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No image
          </div>
        )}
        
        {discount && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded">
            {discount}% OFF
          </div>
        )}
        
        {(isHovered || inWishlist) && (
          <div className="absolute bottom-2 right-2 z-10">
            <Button 
              variant="secondary" 
              size="icon" 
              className={`rounded-full bg-white hover:bg-gray-100 ${inWishlist ? 'text-red-500' : ''}`}
              onClick={handleWishlistToggle}
              type="button"
            >
              <Heart className={`h-4 w-4 ${inWishlist ? 'fill-red-500' : ''}`} />
            </Button>
          </div>
        )}
        
        {product.quantity <= 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <span className="text-white font-medium px-3 py-1 bg-black bg-opacity-60 rounded">
              Sold Out
            </span>
          </div>
        )}
      </div>
      
      <h3 className="font-medium text-sm mb-1 group-hover:text-[#4A332F] transition-colors">
        {product.title}
      </h3>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{formatPrice(product.price)}</span>
        {product.compare_at_price && product.compare_at_price > product.price && (
          <span className="text-gray-400 line-through text-xs">
            {formatPrice(product.compare_at_price)}
          </span>
        )}
      </div>
    </Link>
  );
}