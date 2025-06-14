'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { products } from '@/lib/data';
import Image from 'next/image';
import Link from 'next/link';

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof products>([]);

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
    <>
      <button onClick={() => setOpen(true)} className="hover:text-primary">
        <Search className="w-5 h-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="bg-white w-full min-h-screen md:min-h-[600px] md:max-h-[85vh] md:mt-24 md:mx-auto md:max-w-2xl md:rounded-lg">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="flex-1 bg-transparent outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button onClick={() => setOpen(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
              {searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="relative w-16 h-16">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-sm text-gray-500">${product.price}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchQuery.length > 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No products found for &quot;{searchQuery}&quot;
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}