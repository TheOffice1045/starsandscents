export interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  isNew?: boolean;
  salesCount?: number;
}