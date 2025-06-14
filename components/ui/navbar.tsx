import { useWishlistStore } from "@/lib/store/wishlist";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface NavItem {
  id?: string;
  href: string;
  label: string;
  icon?: React.ReactNode;
}

const navigationItems: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/collections', label: 'Collections' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' }
];

// Inside your Navbar component
export function Navbar() {
  // Add this to prevent hydration errors
  const [mounted, setMounted] = useState(false);
  
  // Get wishlist items
  const wishlistItems = useWishlistStore((state) => state.items);
  const wishlistCount = wishlistItems.length;
  
  // Only run on client side
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <nav>
      {/* Your existing navigation */}
      
      {/* If you have a list of navigation items, make sure each has a unique key */}
      {navigationItems.map((item) => (
        <Link 
          key={item.id || item.href} // Use a unique identifier
          href={item.href}
          className="relative"
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
      
      <Link href="/wishlist" className="relative">
        <Heart className="h-5 w-5" />
        {mounted && wishlistCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {wishlistCount}
          </span>
        )}
      </Link>
      
      {/* Rest of your navigation */}
    </nav>
  );
}