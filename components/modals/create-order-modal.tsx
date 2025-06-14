"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/ui/admin-button";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
}

export function CreateOrderModal({ isOpen, onClose, onOrderCreated }: CreateOrderModalProps) {
  const [date, setDate] = useState("");
  const [hour, setHour] = useState<number | "">("");
  const [minute, setMinute] = useState<number | "">("");
  const [status, setStatus] = useState("pending");
  const [customer, setCustomer] = useState("guest");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!date) {
      toast({
        title: "Missing information",
        description: "Please provide a date for the order",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create timestamp from date and time inputs
      const orderDate = new Date(date);
      if (typeof hour === 'number') orderDate.setHours(hour);
      if (typeof minute === 'number') orderDate.setMinutes(minute);
      
      // Create the order in Supabase
      const { data, error } = await supabase.from('orders').insert({
        created_at: orderDate.toISOString(),
        status,
        customer_id: customer === 'guest' ? null : customer,
        created_by: user?.id
      }).select();
      
      if (error) {
        toast({
          title: "Error",
          description: `Failed to create order: ${error.message}`,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Success",
        description: "Order created successfully",
      });
      
      // Notify parent component if callback provided
      if (onOrderCreated) {
        onOrderCreated();
      }
      
      // Close the modal and reset form
      onClose();
    } catch (err) {
      console.error('Error submitting order:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create new order</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* General Section */}
          <div>
            <h3 className="text-lg font-medium mb-4">General</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Date created</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Hour</label>
                    <Input 
                      type="number" 
                      min="0" 
                      max="23" 
                      className="w-20" 
                      value={hour}
                      onChange={(e) => setHour(e.target.value ? parseInt(e.target.value) : "")}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Minute</label>
                    <Input 
                      type="number" 
                      min="0" 
                      max="59" 
                      className="w-20" 
                      value={minute}
                      onChange={(e) => setMinute(e.target.value ? parseInt(e.target.value) : "")}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending payment</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Customer</label>
                <Select value={customer} onValueChange={setCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Billing Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Billing</h3>
              <button className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
            </div>
            <p className="text-sm text-gray-500">No billing address set.</p>
          </div>

          {/* Shipping Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Shipping</h3>
              <button className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
            </div>
            <p className="text-sm text-gray-500">No shipping address set.</p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <AdminButton variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </AdminButton>
            <AdminButton onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Order"}
            </AdminButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}