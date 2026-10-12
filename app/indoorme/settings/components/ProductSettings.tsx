"use client";

import { AdminButton } from "@/components/ui/admin-button";
import { createBrowserClient } from '@supabase/ssr';
import { useSettingsStore } from "@/lib/store/settings";
import { toast } from "sonner";

// Add the props interface
interface ProductSettingsProps {
  storeId: string | null;
}

export default function ProductSettings({ storeId }: ProductSettingsProps) {
  const { settings, updateSettings } = useSettingsStore();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const saveReviewSettings = async () => {
    try {
      // Check if storeId exists
      if (!settings.storeId) {
        console.error("Store ID is missing");
        throw new Error("Store ID is missing. Please refresh the page or contact support.");
      }
      
      // Save review settings to database
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          store_id: settings.storeId,
          reviews_enabled: settings.reviewsEnabled,
          star_ratings_enabled: settings.starRatingsEnabled,
          star_ratings_required: settings.starRatingsRequired,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error saving review settings:", error);
      throw error;
    }
  };

  const saveProductSettings = async () => {
    try {
      // Check if storeId exists
      if (!storeId) {
        console.error("Store ID is missing");
        throw new Error("Store ID is missing. Please refresh the page or contact support.");
      }
      
      // Save product settings to database
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          store_id: storeId,
          reviews_enabled: settings.reviewsEnabled,
          star_ratings_enabled: settings.starRatingsEnabled,
          star_ratings_required: settings.starRatingsRequired,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'store_id'  // Add this to specify the conflict resolution
        });
        
      if (error) throw error;
      
      // Update any cache or local state if needed
      updateSettings({
        reviewsEnabled: settings.reviewsEnabled,
        starRatingsEnabled: settings.starRatingsEnabled,
        starRatingsRequired: settings.starRatingsRequired
      });
      
      return true;
    } catch (error) {
      console.error("Error saving product settings:", error);
      throw error;
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Reviews Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-6">Reviews</h2>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-medium">Enable reviews</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-reviews"
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  checked={settings.reviewsEnabled}
                  onChange={(e) => updateSettings({ reviewsEnabled: e.target.checked })}
                  style={{ accentColor: 'black' }}
                />
                <label htmlFor="enable-reviews" className="text-sm text-gray-700">Enable product reviews</label>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-base font-medium">Product ratings</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-star-ratings"
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  checked={settings.starRatingsEnabled}
                  onChange={(e) => updateSettings({ starRatingsEnabled: e.target.checked })}
                  style={{ accentColor: 'black' }}
                />
                <label htmlFor="enable-star-ratings" className="text-sm text-gray-700">Enable star rating on reviews</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="require-star-ratings"
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  checked={settings.starRatingsRequired}
                  onChange={(e) => updateSettings({ starRatingsRequired: e.target.checked })}
                  style={{ accentColor: 'black' }}
                />
                <label htmlFor="require-star-ratings" className="text-sm text-gray-700">Star ratings should be required, not optional</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <AdminButton onClick={async () => {
          try {
            await saveProductSettings();
            toast.success("Review settings saved successfully");
          } catch (error: any) {
            toast.error(`Failed to save settings: ${error.message || 'Unknown error'}`);
          }
        }}>Save changes</AdminButton>
      </div>
    </div>
  );
}