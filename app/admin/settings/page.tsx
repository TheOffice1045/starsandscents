"use client";

import { useState, useEffect } from "react";
import { useSettingsStore } from "@/lib/store/settings";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { SettingsTab } from "./types";

// Import tab components
import GeneralSettings from "./components/GeneralSettings";
import ProductSettings from "./components/ProductSettings";
import ShippingSettings from "./components/ShippingSettings";
import PaymentSettings from "./components/PaymentSettings";
import VisibilitySettings from "./components/VisibilitySettings";
import RolesPermissionsSettings from "./components/RolesPermissionsSettings";

const tabs: SettingsTab[] = [
  "General",
  "Products",
  "Shipping",
  "Payments",
  "Roles & Permissions",
  "Site visibility",
];

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
  const [isLoading, setIsLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // Fetch store ID and settings on component mount
  useEffect(() => {
    const fetchStoreId = async () => {
      try {
        setIsLoading(true);
        
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error("User not authenticated");
        }
        
        // Get the store associated with this user
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (storeError) {
          // If the error is that no rows were returned, create a store for the user
          if (storeError.code === 'PGRST116') {
            console.log("No store found, creating one for the user");
            // When creating a new store
            const { data: newStore, error: createError } = await supabase
              .from('stores')
              .insert({
                user_id: user.id,
                name: 'My Store'
                // Removed created_at and updated_at fields
              })
              .select('id')
              .single();
              
            if (createError) {
              console.error("Error creating store:", createError);
              throw new Error(`Failed to create store: ${createError.message}`);
            }
            
            if (!newStore) {
              throw new Error("Failed to create store: No data returned");
            }
            
            // Set the new store ID
            setStoreId(newStore.id);
            updateSettings({ storeId: newStore.id });
            console.log("New store created with ID:", newStore.id);
            
            // Create default settings for the new store
            const { error: insertError } = await supabase
              .from('store_settings')
              .insert({
                store_id: newStore.id,
                store_name: 'My Store',
                time_zone: 'America/New_York',
                auto_dst: true,
                reviews_enabled: false,
                star_ratings_enabled: false,
                star_ratings_required: false,
                site_visibility: 'live',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (insertError) {
              console.error("Error creating default settings:", insertError);
              throw new Error(`Failed to create default settings: ${insertError.message}`);
            }
            
            // Update settings state with defaults
            updateSettings({
              name: 'My Store',
              timeZone: 'America/New_York',
              autoDST: true,
              reviewsEnabled: false,
              starRatingsEnabled: false,
              starRatingsRequired: false,
              address: {
                line1: '',
                line2: '',
                city: '',
                state: '',
                postcode: '',
              }
            });
            
            return;
          } else {
            console.error("Store error:", storeError);
            throw new Error(`Failed to fetch store: ${storeError.message}`);
          }
        }
        
        if (!storeData) {
          throw new Error("No store found for this user");
        }
        
        // Set the store ID in local state
        setStoreId(storeData.id);
        
        // Update the settings with the store ID
        updateSettings({ storeId: storeData.id });
        console.log("Store ID set:", storeData.id);
        
        // Fetch existing settings if available
        const { data: settingsData, error: settingsError } = await supabase
          .from('store_settings')
          .select('*')
          .eq('store_id', storeData.id)
          .single();
          
        if (settingsError) {
          // In the fetchStoreId function where we create default settings
          if (settingsError.code === 'PGRST116') {
          // No settings found, create default settings
          console.log("No settings found, creating defaults");
          const { error: insertError } = await supabase
            .from('store_settings')
            .insert({
              store_id: storeData.id,
              store_name: '',
              time_zone: 'America/New_York',
              auto_dst: true,
              reviews_enabled: false,
              star_ratings_enabled: false,
              star_ratings_required: false,
              site_visibility: 'live'
              // Removed created_at and updated_at fields
            });
            
          if (insertError) {
            console.error("Error creating default settings:", insertError);
            throw new Error(`Failed to create default settings: ${insertError.message}`);
          }
        } else {
          console.error("Settings error:", settingsError);
          throw new Error(`Failed to fetch settings: ${settingsError.message}`);
        }
      } else if (settingsData) {
        // If we have existing settings, update the state
        updateSettings({
          name: settingsData.store_name || '',
          logo: settingsData.store_logo || '',
          address: {
            line1: settingsData.address_line1 || '',
            line2: settingsData.address_line2 || '',
            city: settingsData.address_city || '',
            state: settingsData.address_state || '',
            postcode: settingsData.address_postcode || '',
          },
          timeZone: settingsData.time_zone || 'America/New_York',
          autoDST: settingsData.auto_dst !== false,
          reviewsEnabled: settingsData.reviews_enabled || false,
          starRatingsEnabled: settingsData.star_ratings_enabled || false,
          starRatingsRequired: settingsData.star_ratings_required || false,
        });
      }
      
    } catch (error: any) {
      console.error("Error fetching store settings:", error);
      toast.error(`Failed to load settings: ${error.message}. Please refresh the page.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchStoreId();
}, [supabase, updateSettings]);

return (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-semibold">Settings</h1>
    </div>

    {/* Tabs */}
    <div className="border-b">
      <nav className="-mb-px flex space-x-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              tab === activeTab
                ? "border-[#4A332F] text-[#4A332F]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>

    {/* Tab Content */}
    {isLoading ? (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    ) : (
      <>
        {activeTab === "General" && <GeneralSettings storeId={storeId} />}
        {activeTab === "Products" && <ProductSettings storeId={storeId} />}
        {activeTab === "Shipping" && <ShippingSettings storeId={storeId} />}
        {activeTab === "Payments" && <PaymentSettings storeId={storeId} />}
        {activeTab === "Roles & Permissions" && <RolesPermissionsSettings storeId={storeId} />}
        {activeTab === "Site visibility" && <VisibilitySettings storeId={storeId} />}
      </>
    )}
  </div>
);
}