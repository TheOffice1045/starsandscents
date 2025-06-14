"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Bell } from "lucide-react";

export default function NotificationsTab({ user, profile }: { user: any, profile: any }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [preferences, setPreferences] = useState({
    emailSubscription: profile?.email_subscription || false,
    orderUpdates: true,
    promotions: profile?.promotions_subscription || false,
    newProducts: profile?.new_products_subscription || false,
    accountActivity: true
  });
  
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  const handleToggle = (key: string, value: boolean) => {
    setPreferences({
      ...preferences,
      [key]: value
    });
  };
  
  const savePreferences = async () => {
    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('customers')
        .update({
          email_subscription: preferences.emailSubscription,
          promotions_subscription: preferences.promotions,
          new_products_subscription: preferences.newProducts
        })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      toast.success("Notification preferences updated");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to update notification preferences");
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Manage how we contact you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Email Notifications</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Order Updates</div>
                  <div className="text-sm text-gray-500">Receive updates about your orders</div>
                </div>
                <Switch 
                  checked={preferences.orderUpdates} 
                  onCheckedChange={(checked) => handleToggle('orderUpdates', checked)}
                  disabled={true} // Critical notifications can't be disabled
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Account Activity</div>
                  <div className="text-sm text-gray-500">Receive updates about your account security</div>
                </div>
                <Switch 
                  checked={preferences.accountActivity} 
                  onCheckedChange={(checked) => handleToggle('accountActivity', checked)}
                  disabled={true} // Critical notifications can't be disabled
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Promotional Emails</div>
                  <div className="text-sm text-gray-500">Receive emails about sales and special offers</div>
                </div>
                <Switch 
                  checked={preferences.promotions} 
                  onCheckedChange={(checked) => handleToggle('promotions', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">New Product Announcements</div>
                  <div className="text-sm text-gray-500">Get notified when new products are available</div>
                </div>
                <Switch 
                  checked={preferences.newProducts} 
                  onCheckedChange={(checked) => handleToggle('newProducts', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Email Newsletter</div>
                  <div className="text-sm text-gray-500">Subscribe to our weekly newsletter</div>
                </div>
                <Switch 
                  checked={preferences.emailSubscription} 
                  onCheckedChange={(checked) => handleToggle('emailSubscription', checked)}
                />
              </div>
            </div>
            
            <div className="pt-2">
              <Button onClick={savePreferences} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : "Save Preferences"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>Your latest updates and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample notifications - in a real app, these would come from the database */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-sm">Your order has been shipped</div>
                <div className="text-sm text-gray-500">Order #12345 was shipped and is on its way to you.</div>
                <div className="text-xs text-gray-400 mt-1">2 days ago</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-sm">New collection available</div>
                <div className="text-sm text-gray-500">Check out our new summer collection of scented candles.</div>
                <div className="text-xs text-gray-400 mt-1">1 week ago</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium text-sm">Password changed</div>
                <div className="text-sm text-gray-500">Your account password was successfully updated.</div>
                <div className="text-xs text-gray-400 mt-1">2 weeks ago</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="link" size="sm">View all notifications</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}