import { useState, useEffect, Suspense } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { User, Package, Heart, Bell } from "lucide-react";
import ProfileTab from "@/components/account/ProfileTab";
import OrdersTab from "@/components/account/OrdersTab";
import WishlistTab from "@/components/account/WishlistTab";
import NotificationsTab from "@/components/account/NotificationsTab";
import { useRouter, useSearchParams } from "next/navigation";

function AccountContent() {
  "use client";
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Get tab from URL if present
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'orders', 'wishlist', 'notifications'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadUserData() {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/signin');
        return;
      }
      
      setUser(user);
      
      // Get profile data from customers table
      const { data: profileData } = await supabase
        .from('customers')
        .select('*')
        .eq('email', user.email)
        .single();
        
      setProfile(profileData);
      setLoading(false);
    }
    
    loadUserData();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="container max-w-6xl py-12">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-12">
      <h1 className="text-2xl font-medium mb-8">My Account</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row w-full gap-8">
          <div className="w-full md:w-64 shrink-0">
            <Card className="p-1">
              <TabsList className="flex flex-col w-full h-auto bg-transparent space-y-1">
                <TabsTrigger 
                  value="profile" 
                  className="justify-start px-4 py-3"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger 
                  value="orders" 
                  className="justify-start px-4 py-3"
                >
                  <Package className="mr-2 h-4 w-4" />
                  My Orders
                </TabsTrigger>
                <TabsTrigger 
                  value="wishlist" 
                  className="justify-start px-4 py-3"
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Wishlist
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications" 
                  className="justify-start px-4 py-3"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </TabsTrigger>
              </TabsList>
            </Card>
          </div>
          
          <div className="flex-1">
            <TabsContent value="profile" className="m-0 mt-0">
              <ProfileTab user={user} profile={profile} />
            </TabsContent>
            <TabsContent value="orders" className="m-0 mt-0">
              <OrdersTab user={user} />
            </TabsContent>
            <TabsContent value="wishlist" className="m-0 mt-0">
              <WishlistTab user={user} />
            </TabsContent>
            <TabsContent value="notifications" className="m-0 mt-0">
              <NotificationsTab user={user} profile={profile} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountContent />
    </Suspense>
  );
}