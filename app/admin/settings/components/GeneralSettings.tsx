"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/ui/admin-button";
import { useSettingsStore } from "@/lib/store/settings";
import { createBrowserClient } from '@supabase/ssr';
import { toast } from "sonner";
import Image from 'next/image';

// Add the props interface
interface GeneralSettingsProps {
  storeId: string | null;
}

// Update StoreSettings type to include all required properties
interface StoreSettings {
  timeZone: string;
  autoDST: boolean;
  logo?: string;
  // ... other properties
}

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
] as const;

export default function GeneralSettings({ storeId }: GeneralSettingsProps) {
  const { settings, updateSettings } = useSettingsStore();
  const [storeLogo, setStoreLogo] = useState<string | null>(settings.logo || null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [heroImage, setHeroImage] = useState<string | null>(settings.heroImage || null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ name: e.target.value });
  };

  const handleSloganChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ slogan: e.target.value });
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size should be less than 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const logoData = e.target?.result as string;
        setStoreLogo(logoData);
        updateSettings({ logo: logoData });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeroImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }

      try {
        setIsUploading(true);
        
        // First, display the image preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageData = e.target?.result as string;
          setHeroImage(imageData);
        };
        reader.readAsDataURL(file);
        
        // Generate a unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `hero-images/${Date.now()}.${fileExt}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('store-assets')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (error) throw error;
        
        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('store-assets')
          .getPublicUrl(fileName);
          
        // Update settings with the storage URL
        updateSettings({ heroImageUrl: publicUrlData.publicUrl });
        
        toast.success("Hero image uploaded successfully");
      } catch (error: any) {
        console.error("Error uploading hero image:", error);
        toast.error(`Failed to upload image: ${error.message}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const saveGeneralSettings = async () => {
    try {
      // Check if storeId exists
      if (!storeId) {
        console.error("Store ID is missing");
        throw new Error("Store ID is missing. Please refresh the page or contact support.");
      }
      
      // Save general settings to database
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          store_id: storeId,
          store_name: settings.name || '',
          store_slogan: settings.slogan || '',
          store_logo: settings.logo || '',
          address_line1: settings.address?.line1 || '',
          address_line2: settings.address?.line2 || '',
          address_city: settings.address?.city || '',
          address_state: settings.address?.state || '',
          address_postcode: settings.address?.postcode || '',
          time_zone: settings.timeZone || 'America/New_York',
          auto_dst: settings.autoDST !== false
        }, {
          onConflict: 'store_id'  // Add this to specify the conflict resolution
        });
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error saving general settings:", error);
      throw error;
    }
  };

  const handleUpdateSettings = (newSettings: Partial<StoreSettings>) => {
    updateSettings(newSettings);
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Store Details */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-6">Store Details</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Name
            </label>
            <Input 
              placeholder="Enter store name"
              value={settings.name}
              onChange={handleNameChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Slogan
            </label>
            <Input 
              placeholder="Enter store slogan"
              value={settings.slogan || ''}
              onChange={handleSloganChange}
            />
            <p className="mt-2 text-sm text-gray-500">
              A catchy slogan that describes your store (optional).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Logo
            </label>
            <div className="mt-1 flex items-center gap-4">
              <div className="relative h-32 w-32">
                <Image
                  src={storeLogo || settings.logo || '/placeholder.png'}
                  alt="Store logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoChange}
                  accept="image/*"
                  className="hidden"
                />
                <AdminButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                >
                  Change Logo
                </AdminButton>
                {(storeLogo || settings.logo) && (
                  <button
                    onClick={() => {
                      setStoreLogo(null);
                      updateSettings({ logo: '' });
                    }}
                    className="block text-xs text-gray-400 hover:text-gray-900"
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Recommended size: 400x400px. Max file size: 2MB.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-6">Store Address</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address line 1
            </label>
            <Input 
              placeholder="Enter address line 1" 
              value={settings.address?.line1 || ''}
              onChange={(e) => updateSettings({ 
                address: { ...settings.address, line1: e.target.value } 
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address line 2
            </label>
            <Input 
              placeholder="Enter address line 2" 
              value={settings.address?.line2 || ''}
              onChange={(e) => updateSettings({ 
                address: { ...settings.address, line2: e.target.value } 
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <Input 
              placeholder="Enter city" 
              value={settings.address?.city || ''}
              onChange={(e) => updateSettings({ 
                address: { ...settings.address, city: e.target.value } 
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={settings.address?.state || ''}
              onChange={(e) => updateSettings({ 
                address: { ...settings.address, state: e.target.value } 
              })}
            >
              <option value="">Select a state</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postcode / ZIP
            </label>
            <Input 
              placeholder="Enter postcode" 
              value={settings.address?.postcode || ''}
              onChange={(e) => updateSettings({ 
                address: { ...settings.address, postcode: e.target.value } 
              })}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-6">Time Zone Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Time Zone
            </label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={settings.timeZone || 'America/New_York'}
              onChange={(e) => updateSettings({ timeZone: e.target.value })}
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Anchorage">Alaska Time (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              This time zone will be used for order timestamps and reports.
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <input
              type="checkbox"
              id="auto-dst"
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              checked={settings.autoDST !== false}
              onChange={(e) => updateSettings({ autoDST: e.target.checked })}
              style={{ accentColor: 'black' }}
            />
            <label htmlFor="auto-dst" className="text-sm text-gray-700">
              Automatically adjust for daylight saving time
            </label>
          </div>
        </div>
      </div>

      {/* Save changes button for General settings */}
      <div className="flex justify-end">
        <AdminButton onClick={async () => {
          try {
            await saveGeneralSettings();
            toast.success("General settings saved successfully");
          } catch (error: any) {
            toast.error(`Failed to save settings: ${error.message || 'Unknown error'}`);
          }
        }}>Save changes</AdminButton>
      </div>
    </div>
  );
}