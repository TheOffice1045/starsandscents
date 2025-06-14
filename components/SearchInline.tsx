'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { products } from '@/lib/data';
import Image from 'next/image';
import Link from 'next/link';
import { useOnClickOutside } from '@/lib/hooks/use-on-click-outside';

export function SearchInline() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof products>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(searchRef, () => {
    setIsExpanded(false);
    setSearchQuery('');
  });

  useEffect(() => {
    if (searchQuery.length > 0) {
      const results = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  return (
    <div ref={searchRef} className="relative flex items-center">
      <button 
        onClick={() => setIsExpanded(true)} 
        className="hover:text-primary p-2 relative z-[60]"
        style={{ opacity: isExpanded ? 0 : 1 }}
      >
        <Search className="w-5 h-5" />
      </button>

      {isExpanded && (
        <div className="fixed top-[72px] right-4 w-[300px] bg-gray-50 rounded-md z-[100]">
          <div className="flex items-center w-full">
            <Search className="w-5 h-5 text-gray-400 ml-3" />
            <input
              type="text"
              placeholder="Search products..."
              className="flex-1 bg-transparent p-2 outline-none text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button 
              onClick={() => {
                setIsExpanded(false);
                setSearchQuery('');
              }}
              className="p-2"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {isExpanded && searchResults.length > 0 && (
        <div className="fixed top-[120px] right-4 w-[300px] bg-white shadow-lg rounded-md overflow-hidden z-[100] max-h-[400px] overflow-y-auto">
          {searchResults.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              onClick={() => {
                setIsExpanded(false);
                setSearchQuery('');
              }}
              className="flex items-center gap-4 p-3 hover:bg-gray-50"
            >
              <div className="relative w-12 h-12">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover rounded"
                />
              </div>
              <div>
                <h3 className="font-medium text-sm">{product.name}</h3>
                <p className="text-sm text-gray-500">${product.price}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}