"use client";

import { useCollectionStore } from "@/lib/stores/collection-store";
import Image from "next/image";

interface Collection {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
}

interface CollectionState {
  getVisibleCollections: (type: string) => Collection[];
}

export default function CollectionsPage() {
  const visibleCollections = useCollectionStore((state: CollectionState) => state.getVisibleCollections('shop'));

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Collections</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleCollections.map((collection: Collection) => (
          <div key={collection.id} className="border rounded-lg overflow-hidden">
            <div className="aspect-square relative">
              {collection.image_url && (
                <Image
                  src={collection.image_url}
                  alt={collection.name}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{collection.name}</h2>
              {collection.description && (
                <p className="text-gray-600">{collection.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}