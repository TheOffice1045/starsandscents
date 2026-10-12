export type SettingsTab = 
  | "General" 
  | "Products" 
  | "Shipping" 
  | "Payments" 
  | "Roles & Permissions"
  | "Site visibility";

export type PickupLocation = {
  id: number;
  name: string;
  address: string;
  details?: string;
};

export type ShippingMethod = {
  id: string;
  name: string;
  enabled: boolean;
  settings: {
    [key: string]: any;
  };
};

export type PaymentMethod = {
  id: string;
  name: string;
  enabled: boolean;
  settings: {
    [key: string]: any;
  };
};