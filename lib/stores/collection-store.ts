import { create } from 'zustand';

interface Collection {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  type: string;
  is_visible: boolean;
}

interface CollectionState {
  collections: Collection[];
  getVisibleCollections: (type: string) => Collection[];
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  getVisibleCollections: (type: string) => {
    return get().collections.filter(collection => 
      collection.type === type && collection.is_visible
    );
  },
})); 