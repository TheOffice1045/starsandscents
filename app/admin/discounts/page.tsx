"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { AdminButton } from "@/components/ui/admin-button";

// Define the discount type based on your SQL schema
type Discount = {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  applies_to: 'all' | 'products' | 'collections';
  created_at: string;
  updated_at: string;
};

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterText, setFilterText] = useState("");
  
  // Fetch discounts from Supabase
  useEffect(() => {
    const fetchDiscounts = async () => {
      setLoading(true);
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching discounts:', error);
        toast.error('Failed to load discounts');
      } else {
        setDiscounts(data || []);
      }
      
      setLoading(false);
    };
    
    fetchDiscounts();
    
    // Set up real-time subscription
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const channel = supabase
      .channel('discounts-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'discounts' 
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDiscounts(prev => [payload.new as Discount, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDiscounts(prev => 
              prev.map(discount => 
                discount.id === payload.new.id ? payload.new as Discount : discount
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setDiscounts(prev => 
              prev.filter(discount => discount.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Filter discounts based on search text
  const filteredDiscounts = discounts.filter(discount => 
    discount.code.toLowerCase().includes(filterText.toLowerCase()) ||
    (discount.description && discount.description.toLowerCase().includes(filterText.toLowerCase()))
  );
  
  const toggleAll = () => {
    setSelectedItems(selectedItems.length === filteredDiscounts.length 
      ? [] 
      : filteredDiscounts.map(d => d.id));
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) return;
    
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    
    try {
      if (action === 'activate' || action === 'deactivate') {
        const { error } = await supabase
          .from('discounts')
          .update({ is_active: action === 'activate' })
          .in('id', selectedItems);
        
        if (error) throw error;
        
        toast.success(`${selectedItems.length} discounts ${action === 'activate' ? 'activated' : 'deactivated'}`);
      } else if (action === 'delete') {
        const { error } = await supabase
          .from('discounts')
          .delete()
          .in('id', selectedItems);
        
        if (error) throw error;
        
        toast.success(`${selectedItems.length} discounts deleted`);
      }
      
      setSelectedItems([]);
    } catch (error) {
      console.error(`Error performing bulk action ${action}:`, error);
      toast.error(`Failed to ${action} discounts`);
    }
  };

  const handleStatusChange = async (id: string, isActive: boolean) => {
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { error } = await supabase
        .from('discounts')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(`Discount ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating discount status:', error);
      toast.error('Failed to update discount status');
    }
  };
  
  const handleDeleteDiscount = async (id: string) => {
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Discount deleted');
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast.error('Failed to delete discount');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Discounts</h1>
        <Link href="/admin/discounts/new">
        <AdminButton size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create discount
          </AdminButton>
        </Link>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1">
            <Input 
              placeholder="Filter discounts" 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedItems.length} selected
              </span>
              <Select onValueChange={handleBulkAction}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Bulk actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activate">Activate</SelectItem>
                  <SelectItem value="deactivate">Deactivate</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-y bg-gray-50">
                <th className="p-4 w-[48px]">
                  <div className="flex items-center justify-center">
                    <Checkbox 
                      checked={selectedItems.length === filteredDiscounts.length && filteredDiscounts.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </div>
                </th>
                <th className="text-left text-sm font-medium text-gray-500 p-4">Code</th>
                <th className="text-left text-sm font-medium text-gray-500 p-4">Type</th>
                <th className="text-left text-sm font-medium text-gray-500 p-4">Value</th>
                <th className="text-left text-sm font-medium text-gray-500 p-4">Validity</th>
                <th className="text-left text-sm font-medium text-gray-500 p-4">Usage</th>
                <th className="text-left text-sm font-medium text-gray-500 p-4">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">
                    No discounts found
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((discount) => (
                  <tr key={discount.id}>
                    <td className="p-4 w-[48px]">
                      <div className="flex items-center justify-center">
                        <Checkbox 
                          checked={selectedItems.includes(discount.id)}
                          onCheckedChange={() => toggleItem(discount.id)}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{discount.code}</div>
                        {discount.description && (
                          <div className="text-sm text-gray-500 truncate max-w-[200px]">
                            {discount.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 capitalize">
                      {discount.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                    </td>
                    <td className="p-4">
                      {discount.discount_type === "percentage" 
                        ? `${discount.discount_value}%` 
                        : `$${discount.discount_value.toFixed(2)}`}
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        {discount.starts_at && (
                          <div>From: {format(new Date(discount.starts_at), 'MMM d, yyyy')}</div>
                        )}
                        {discount.expires_at && (
                          <div>Until: {format(new Date(discount.expires_at), 'MMM d, yyyy')}</div>
                        )}
                        {!discount.starts_at && !discount.expires_at && (
                          <div>No time limit</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        {discount.usage_limit ? (
                          <div>{discount.usage_count} / {discount.usage_limit}</div>
                        ) : (
                          <div>{discount.usage_count} / ∞</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`${
                        discount.is_active 
                          ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                        {discount.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/discounts/${discount.id}/edit`} className="flex items-center">
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(
                              discount.id, 
                              !discount.is_active
                            )}
                          >
                            {discount.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteDiscount(discount.id)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}