// Update your Product interface to handle both formats
export interface Product {
  id: string;
  // Support both naming conventions
  name?: string;
  title?: string;
  description?: string;
  price: number;
  oldPrice?: number;
  compare_at_price?: number;
  image?: string;
  images?: {
    id: string;
    url: string;
    alt_text?: string;
    position: number;
  }[];
  // Add other fields as needed
  quantity?: number;
  status?: string;
  sku?: string;
  // ... other fields
}