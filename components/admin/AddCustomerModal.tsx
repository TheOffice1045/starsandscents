"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddCustomerModal({ isOpen, onClose }: AddCustomerModalProps) {
  const [customer, setCustomer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    country: "",
    email_subscription: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setIsSubmitting(true);
    
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      
      const { data, error } = await supabase
        .from('customers')
        .insert({
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email,
          phone: customer.phone,
          country: customer.country,
          email_subscription: customer.email_subscription,
          total_orders: 0,
          total_spent: 0
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      toast.success('Customer added successfully');
      onClose();
      
      // Reset form
      setCustomer({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        country: "",
        email_subscription: false
      });
      
      // Refresh the page to show the new customer
      window.location.reload();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                value={customer.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                value={customer.last_name}
                onChange={handleChange}
                required
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
              required
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
          
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              value={customer.country}
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
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}