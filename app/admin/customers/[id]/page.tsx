"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { AdminButton } from "@/components/ui/admin-button";

export default function EditCustomerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Remove the use() call and use params.id directly
  const customerId = params.id;
  
  const [customer, setCustomer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    email_subscription: false,
    notes: "",
    total_orders: 0,
    total_spent: 0
  });

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setCustomer({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            postal_code: data.postal_code || "",
            country: data.country || "",
            email_subscription: data.email_subscription || false,
            notes: data.notes || "",
            total_orders: data.total_orders || 0,
            total_spent: data.total_spent || 0
          });
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
        toast.error('Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomer();
  }, [customerId]); // Use the extracted variable here

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomer(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setCustomer(prev => ({
      ...prev,
      email_subscription: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      
      const { error } = await supabase
        .from('customers')
        .update({
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          postal_code: customer.postal_code,
          country: customer.country,
          email_subscription: customer.email_subscription,
          notes: customer.notes
        })
        .eq('id', customerId);
      
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      toast.success('Customer updated successfully');
      router.push('/admin/customers');
    } catch (error: any) {
      console.error('Error updating customer:', error);
      // Show more specific error message if available
      toast.error(error?.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/admin/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-medium">Edit Customer</h1>
        </div>
        <AdminButton onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </div>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </AdminButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6 space-y-6">
          <h2 className="text-lg font-medium mb-4">Customer Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                value={customer.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                value={customer.last_name}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={customer.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              value={customer.phone}
              onChange={handleChange}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="email_subscription"
              checked={customer.email_subscription}
              onCheckedChange={handleCheckboxChange}
            />
            <Label htmlFor="email_subscription">Email subscription</Label>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 space-y-6">
          <h2 className="text-lg font-medium mb-4">Address</h2>
          
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              name="address"
              value={customer.address}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                value={customer.city}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                name="state"
                value={customer.state}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                name="postal_code"
                value={customer.postal_code}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                value={customer.country}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 space-y-6">
          <h2 className="text-lg font-medium mb-4">Notes</h2>
          <Textarea
            id="notes"
            name="notes"
            value={customer.notes}
            onChange={handleChange}
            rows={4}
          />
        </div>

        <div className="bg-white rounded-lg border p-6 space-y-6">
          <h2 className="text-lg font-medium mb-4">Order Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_orders">Total Orders</Label>
              <Input
                id="total_orders"
                value={customer.total_orders}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_spent">Total Spent</Label>
              <Input
                id="total_spent"
                value={`$${customer.total_spent.toFixed(2)}`}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}