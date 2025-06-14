import Link from 'next/link';
import Image from 'next/image';
import { products } from '@/lib/data';
import { ProductCard } from "@/components/ProductCard";

interface Product {
  id: number;
  name: string;
  price: number;
  oldPrice?: number | null;
  image: string;
  isNew?: boolean;
}

interface RelatedProductsProps {
  products: Product[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  return (
    <div className="container mx-auto px-4 py-16">
      <h2 className="text-2xl font-medium mb-8">Related Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}