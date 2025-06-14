"use client";

import { useState, useEffect } from "react";
import { AdminButton } from "@/components/ui/admin-button";
import { createBrowserClient } from '@supabase/ssr';
import { useSettingsStore } from "@/lib/store/settings";
import { toast } from "sonner";

interface VisibilitySettingsProps {
  storeId: string | null;
}

export default function VisibilitySettings({ storeId }: VisibilitySettingsProps) {
  const { settings } = useSettingsStore();
  const [siteVisibility, setSiteVisibility] = useState<'live' | 'coming-soon'>('live');
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // Load current visibility setting
  useEffect(() => {
    const loadVisibilitySetting = async () => {
      try {
        setIsLoading(true);
        
        // Fetch current setting from database
        const { data, error } = await supabase
          .from('store_settings')
          .select('site_visibility')
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching visibility settings:", error);
          return;
        }
        
        // Set the current visibility state
        if (data?.site_visibility) {
          setSiteVisibility(data.site_visibility as 'live' | 'coming-soon');
        }
      } catch (error) {
        console.error("Error loading visibility settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVisibilitySetting();
  }, [supabase]);

  const saveVisibilitySettings = async () => {
    try {
      // Check if storeId exists
      if (!settings.storeId) {
        console.error("Store ID is missing");
        throw new Error("Store ID is missing. Please refresh the page or contact support.");
      }
      
      // Save visibility settings to database
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          store_id: settings.storeId,
          site_visibility: siteVisibility,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'store_id'
        });
        
      if (error) throw error;
      
      // If changing to live mode, refresh the page to apply changes immediately
      if (siteVisibility === 'live') {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      
      return true;
    } catch (error) {
      console.error("Error saving visibility settings:", error);
      throw error;
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading visibility settings...</div>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-6">Site Visibility</h2>
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="visibility-live"
                name="site-visibility"
                value="live"
                checked={siteVisibility === 'live'}
                onChange={(e) => setSiteVisibility(e.target.value as 'live' | 'coming-soon')}
                className="h-4 w-4 border-gray-300 text-black focus:ring-black"
                style={{ accentColor: 'black' }}
              />
              <div>
                <label htmlFor="visibility-live" className="text-sm font-medium text-gray-700">
                  Live
                </label>
                <p className="text-sm text-gray-500">Your site is visible to everyone.</p>
              </div>
            </div>
  
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="visibility-coming-soon"
                name="site-visibility"
                value="coming-soon"
                checked={siteVisibility === 'coming-soon'}
                onChange={(e) => setSiteVisibility(e.target.value as 'live' | 'coming-soon')}
                className="h-4 w-4 border-gray-300 text-black focus:ring-black"
                style={{ accentColor: 'black' }}
              />
              <div>
                <label htmlFor="visibility-coming-soon" className="text-sm font-medium text-gray-700">
                  Coming Soon
                </label>
                <p className="text-sm text-gray-500">Your site is hidden from visitors behind a &quot;Coming soon&quot; landing page until it&apos;s ready for viewing.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      <div className="flex justify-end">
        <AdminButton onClick={async () => {
          try {
            await saveVisibilitySettings();
            toast.success("Visibility settings saved successfully");
          } catch (error: any) {
            toast.error(`Failed to save settings: ${error.message || 'Unknown error'}`);
          }
        }}>Save changes</AdminButton>
      </div>
    </div>
  );
}