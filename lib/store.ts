"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface StoreState {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      cart: [],
      addToCart: (product) => {
        set((state) => {
          const existingItem = state.cart.find(
            (item) => item.product.id === product.id
          );
          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          return { cart: [...state.cart, { product, quantity: 1 }] };
        });
      },
      removeFromCart: (productId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.product.id !== productId),
        }));
      },
      updateQuantity: (productId, quantity) => {
        set((state) => ({
          cart: state.cart.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        }));
      },
      clearCart: () => set({ cart: [] }),
      getCartTotal: () => {
        const state = get();
        return state.cart.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },
    }),
    {
      name: "cart-storage",
    }
  )
);