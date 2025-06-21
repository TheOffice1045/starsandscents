import { useWishlistStore } from "@/lib/store/wishlist";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

export function WishlistTab() {
  const { items, removeItem } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addItem);

  const handleAddToCart = (item: any) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      stock: item.stock || 0,
    });
    
    toast.success('Added to cart');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-medium">My Wishlist</h2>
      
      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Your wishlist is empty</p>
          <Link href="/shop">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 border rounded-md">
              <div className="relative w-20 h-20 flex-shrink-0">
                {item.image ? (
                  <Image 
                    src={item.image} 
                    alt={item.name}
                    fill
                    className="object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-500">No image</span>
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleAddToCart(item)}
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}