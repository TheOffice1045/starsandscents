import { create } from "zustand";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";

// Define types for better type safety
interface Order {
  id: string;
  customer_id: string;
  order_date: string;
  status: string;
  total: number;
  items: OrderItem[];
  discount?: number;
  discount_code?: string;
  discount_type?: 'percentage' | 'fixed_amount';
  // Add other fields as needed
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  // Add other fields as needed
}

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  quantity: number;
  // Add other fields as needed
}

interface Collection {
  id: string;
  name: string;
  // Add other fields as needed
}

interface OrderStore {
  orders: Order[];
  products: Product[];
  collections: Collection[];
  loading: boolean;
  fetchOrders: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchCollections: () => Promise<void>;
  createOrder: (orderData: any) => Promise<any>;
  updateOrder: (id: string, orderData: any) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
}

export const useOrderStore = create<OrderStore>((set, get) => {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  return {
    orders: [],
    products: [],
    collections: [],
    loading: false,
    
    fetchOrders: async () => {
      try {
        set({ loading: true });
        
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*)
          `)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        set({ orders: data || [], loading: false });
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to fetch orders');
        set({ loading: false });
      }
    },
    
    fetchProducts: async () => {
      try {
        set({ loading: true });
        
        const { data, error } = await supabase
          .from('products')
          .select('*');
        
        if (error) throw error;
        
        set({ products: data || [], loading: false });
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to fetch products');
        set({ loading: false });
      }
    },
    
    fetchCollections: async () => {
      try {
        set({ loading: true });
        
        const { data, error } = await supabase
          .from('collections')
          .select('*');
        
        if (error) throw error;
        
        set({ collections: data || [], loading: false });
      } catch (error) {
        console.error('Error fetching collections:', error);
        toast.error('Failed to fetch collections');
        set({ loading: false });
      }
    },
    
    createOrder: async (orderData) => {
      try {
        // Make sure to include discount in your order data
        const orderWithDiscount = {
          ...orderData,
          discount: orderData.discount || 0, // Default to 0 if not provided
          discount_code: orderData.discountCode || null,
          discount_type: orderData.discountType || null
        };
        
        // First create the order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([orderWithDiscount])
          .select()
          .single();
          
        if (orderError) throw orderError;
        
        // Then create order items if they exist
        if (orderData.items && orderData.items.length > 0) {
          const orderItems = orderData.items.map((item: { product_id: string; quantity: number; price: number }) => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            status: 'active'
          }));
          
          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);
            
          if (itemsError) throw new Error(itemsError.message);
        }
        
        // Update the orders list
        set(state => ({
          orders: [order, ...state.orders]
        }));
        
        toast.success('Order created successfully');
        return order;
      } catch (error) {
        console.error('Error creating order:', error instanceof Error ? error.message : 'Unknown error');
        toast.error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
      }
    },
    
    updateOrder: async (id, orderData) => {
      try {
        set({ loading: true });
        
        const { error } = await supabase
          .from('orders')
          .update(orderData)
          .eq('id', id);
          
        if (error) throw error;
        
        // Update the local state
        set(state => ({
          orders: state.orders.map(order => 
            order.id === id ? { ...order, ...orderData } : order
          ),
          loading: false
        }));
        
        toast.success('Order updated successfully');
      } catch (error) {
        console.error('Error updating order:', error);
        toast.error('Failed to update order');
        set({ loading: false });
      }
    },
    
    deleteOrder: async (id) => {
      try {
        set({ loading: true });
        
        // First delete related order items
        const { error: itemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', id);
          
        if (itemsError) throw itemsError;
        
        // Then delete the order
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Update the local state
        set(state => ({
          orders: state.orders.filter(order => order.id !== id),
          loading: false
        }));
        
        toast.success('Order deleted successfully');
      } catch (error) {
        console.error('Error deleting order:', error);
        toast.error('Failed to delete order');
        set({ loading: false });
      }
    }
  };
});