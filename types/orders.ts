export type OrderPaymentStatus = 'pending' | 'authorized' | 'paid' | 'refunded' | 'failed';
export type OrderFulfillmentStatus = 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' | 'shipped' | 'delivered';

export interface Order {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  payment_status: OrderPaymentStatus;
  fulfillment_status: OrderFulfillmentStatus;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  notes?: string;
  is_open: boolean;
  created_by?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  options?: Record<string, any>;
}

export interface Address {
  id: string;
  order_id: string;
  first_name?: string;
  last_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  phone?: string;
}

export interface ShippingAddress extends Address {}
export interface BillingAddress extends Address {}

export interface OrderHistory {
  id: string;
  order_id: string;
  status_from?: string;
  status_to: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface CreateOrderInput {
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  payment_status?: OrderPaymentStatus;
  fulfillment_status?: OrderFulfillmentStatus;
  tax?: number;
  shipping?: number;
  discount?: number;
  notes?: string;
  items: {
    product_id?: string;
    product_name: string;
    quantity: number;
    price: number;
    options?: Record<string, any>;
  }[];
  shipping_address?: Omit<ShippingAddress, 'id' | 'order_id'>;
  billing_address?: Omit<BillingAddress, 'id' | 'order_id'>;
}