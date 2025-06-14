"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Collection {
  id: string;
  name: string;
}

interface CollectionStore {
  collections: Collection[];
  addCollection: (collection: Collection) => void;
  removeCollection: (id: string) => void;
  getCollections: () => Collection[];
}

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set, get) => ({
      collections: [],
      addCollection: (collection) =>
        set((state) => ({
          collections: [...state.collections, collection],
        })),
      removeCollection: (id) =>
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
        })),
      getCollections: () => get().collections,
    }),
    {
      name: "collections-storage",
    }
  )
);