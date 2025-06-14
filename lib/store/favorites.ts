import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesStore {
  favorites: string[];
  addToFavorites: (productId: string) => void;
  removeFromFavorites: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      addToFavorites: (productId) => {
        set((state) => ({
          favorites: [...state.favorites, productId],
        }));
      },
      removeFromFavorites: (productId) => {
        set((state) => ({
          favorites: state.favorites.filter((id) => id !== productId),
        }));
      },
      isFavorite: (productId) => {
        return get().favorites.includes(productId);
      },
    }),
    {
      name: 'favorites-storage',
    }
  )
);