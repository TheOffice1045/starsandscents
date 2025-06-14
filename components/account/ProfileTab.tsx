"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ProfileTab({ user, profile }: { user: any, profile: any }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Initialize form state from user metadata and profile data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  // Load user data into form fields
  useEffect(() => {
    if (user) {
      // First try to get values from user metadata
      const metadata = user.user_metadata || {};
      
      setFirstName(metadata.first_name || profile?.first_name || "");
      setLastName(metadata.last_name || profile?.last_name || "");
      setPhone(metadata.phone || profile?.phone || "");
      setAddress1(metadata.address_line1 || profile?.address_line1 || "");
      setAddress2(metadata.address_line2 || profile?.address_line2 || "");
      setCity(metadata.city || profile?.city || "");
      setState(metadata.state || profile?.state || "");
      setPostalCode(metadata.postal_code || profile?.postal_code || "");
      setCountry(metadata.country || profile?.country || "United States");
    }
  }, [user, profile]);
  
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName) {
      toast.error("Please enter your name");
      return;
    }
    
    try {
      setIsUpdating(true);
      
      // Get the current session to ensure we have authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Auth session missing! Please log in again.");
      }
      
      // Update user metadata in the auth.users table
      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          address_line1: address1,
          address_line2: address2,
          city: city,
          state: state,
          postal_code: postalCode,
          country: country,
          full_name: `${firstName} ${lastName}`
        }
      });
      
      if (userUpdateError) throw userUpdateError;
      
      // Also update the customers table to keep data in sync
      if (profile?.id) {
        const { error: profileUpdateError } = await supabase
          .from('customers')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            address_line1: address1,
            address_line2: address2,
            city: city,
            state: state,
            postal_code: postalCode,
            country: country
          })
          .eq('id', profile.id);
        
        if (profileUpdateError) throw profileUpdateError;
      }
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(`Failed to update profile: ${error.message}`);
      
      // If session is missing, redirect to sign in
      if (error.message.includes("Auth session missing")) {
        // You might want to redirect to sign in page
        window.location.href = "/signin";
      }
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    try {
      setIsChangingPassword(true);
      
      // First verify the current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      
      if (signInError) {
        throw new Error("Current password is incorrect");
      }
      
      // Then update to the new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your account profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <Input 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <Input 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder="Last name"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input 
                value={user?.email || ""} 
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="Phone number"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Address Line 1</label>
              <Input 
                value={address1} 
                onChange={(e) => setAddress1(e.target.value)} 
                placeholder="Street address"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Address Line 2</label>
              <Input 
                value={address2} 
                onChange={(e) => setAddress2(e.target.value)} 
                placeholder="Apt, suite, etc. (optional)"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">City</label>
                <Input 
                  value={city} 
                  onChange={(e) => setCity(e.target.value)} 
                  placeholder="City"
                />
              </div>
              <div>
                <label className="text-sm font-medium">State/Province</label>
                <Input 
                  value={state} 
                  onChange={(e) => setState(e.target.value)} 
                  placeholder="State/Province"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Postal Code</label>
                <Input 
                  value={postalCode} 
                  onChange={(e) => setPostalCode(e.target.value)} 
                  placeholder="Postal code"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <Input 
                  value={country} 
                  onChange={(e) => setCountry(e.target.value)} 
                  placeholder="Country"
                />
              </div>
            </div>
            
            <div className="pt-2">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : "Update Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Password</label>
              <Input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                placeholder="Current password"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">New Password</label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="New password"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Confirm new password"
              />
            </div>
            
            <div className="pt-2">
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : "Change Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}