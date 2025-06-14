import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,
      
      addItem: (item) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((i) => i.id === item.id);
        
        if (existingItem) {
          // Update quantity if item already exists
          return get().updateQuantity(item.id, existingItem.quantity + item.quantity);
        }
        
        set((state) => {
          const updatedItems = [...state.items, item];
          return {
            items: updatedItems,
            totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            totalPrice: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          };
        });
      },
      
      removeItem: (id) => {
        set((state) => {
          const updatedItems = state.items.filter((item) => item.id !== id);
          return {
            items: updatedItems,
            totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            totalPrice: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          };
        });
      },
      
      updateQuantity: (id, quantity) => {
        set((state) => {
          const updatedItems = state.items.map((item) => 
            item.id === id ? { ...item, quantity } : item
          );
          return {
            items: updatedItems,
            totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            totalPrice: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          };
        });
      },
      
      clearCart: () => {
        set({
          items: [],
          totalItems: 0,
          totalPrice: 0,
        });
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);