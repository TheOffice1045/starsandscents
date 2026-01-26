import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StateCreator } from 'zustand';
import { createBrowserClient } from '@supabase/ssr';

interface StoreAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface StoreSettings {
  name: string;
  slogan?: string;
  logo?: string;
  heroImage?: string;
  heroImageUrl?: string; // Add this field for the Supabase Storage URL
  address?: StoreAddress;
  phone?: string;
  email?: string;
  timeZone: string;
  autoDST: boolean;
  reviewsEnabled: boolean;
  starRatingsEnabled: boolean;
  starRatingsRequired: boolean;
  storeId?: string;
}

interface SettingsState {
  settings: {
    theme: 'light' | 'dark';
    currency: string;
    language: string;
    notifications: boolean;
    name: string;
    slogan: string;
    logo: string;
    heroImage?: string;
    heroImageUrl?: string;
    address?: StoreAddress;
    phone?: string;
    email?: string;
    timeZone: string;
    autoDST: boolean;
    reviewsEnabled: boolean;
    starRatingsEnabled: boolean;
    starRatingsRequired: boolean;
    storeId: string;
  };
  isLoading: boolean;
  error: string | null;
  updateSettings: (newSettings: Partial<SettingsState['settings']>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchReviewSettings: () => Promise<void>;
  fetchStoreSettings: () => Promise<void>;
}

const createSettingsStore: StateCreator<SettingsState> = (set) => ({
  settings: {
    theme: 'light',
    currency: 'USD',
    language: 'en',
    notifications: true,
    name: 'Stars And Scents',
    slogan: '',
    logo: '',
    phone: '',
    email: '',
    timeZone: 'America/New_York',
    autoDST: true,
    reviewsEnabled: true,
    starRatingsEnabled: true,
    starRatingsRequired: true,
    storeId: '', // This will be set when the store is created
  },
  isLoading: false,
  error: null,
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...newSettings,
      },
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  fetchReviewSettings: async () => {
    try {
      const response = await fetch('/api/admin/settings/reviews');
      if (!response.ok) throw new Error('Failed to fetch review settings');
      const data = await response.json();
      set((state) => ({
        settings: {
          ...state.settings,
          ...data
        }
      }));
    } catch (error) {
      console.error('Error fetching review settings:', error);
    }
  },
  fetchStoreSettings: async () => {
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        set((state) => ({
          settings: {
            ...state.settings,
            name: data.store_name || state.settings.name,
            slogan: data.store_slogan || state.settings.slogan,
            logo: data.logo_url || state.settings.logo,
            phone: data.phone || state.settings.phone,
            email: data.email || state.settings.email,
          },
        }));
      }
    } catch (error) {
      console.error('Error fetching store settings:', error);
    }
  }
});

export const useSettingsStore = create<SettingsState>()(
  persist(createSettingsStore, {
    name: 'settings-storage',
  })
);

// Add to your existing settings store

// Update the settings type to include review settings
interface Settings {
  name: string;
  slogan?: string;
  logo: string;
  heroImage?: string;
  heroImageUrl?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  reviewsEnabled: boolean;
  starRatingsEnabled: boolean;
  starRatingsRequired: boolean;
}
