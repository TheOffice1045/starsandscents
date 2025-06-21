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
import { MoreHorizontal, Pencil, Trash, Plus, Copy, Eye, Files } from "lucide-react";
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
  const [viewDiscount, setViewDiscount] = useState<Discount | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  
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

  // Copy discount code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Discount code copied!");
  };

  // View details
  const handleViewDetails = (discount: Discount) => {
    setViewDiscount(discount);
    setShowViewModal(true);
  };

  // Duplicate discount
  const handleDuplicate = async (discount: Discount) => {
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { error } = await supabase.from('discounts').insert({
        ...discount,
        id: undefined,
        code: discount.code + "-COPY",
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Discount duplicated');
    } catch (error) {
      toast.error('Failed to duplicate discount');
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

      <div className="bg-white rounded-xl border admin-table overflow-x-auto">
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1">
            <Input 
              placeholder="Filter discounts" 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="admin-input"
            />
          </div>
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedItems.length} selected
              </span>
              <Select onValueChange={handleBulkAction}>
                <SelectTrigger className="w-[180px] admin-select">
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
          <table className="w-full admin-table text-[13px] font-normal" style={{ fontFamily: "'Waldenburg', system-ui, sans-serif" }}>
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 w-[48px]">
                  <div className="flex items-center justify-center">
                    <Checkbox 
                      checked={selectedItems.length === filteredDiscounts.length && filteredDiscounts.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </div>
                </th>
                <th className="text-left font-semibold px-4 py-3 text-gray-700 whitespace-nowrap">Code</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-700 whitespace-nowrap">Type</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-700 whitespace-nowrap">Value</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-700 whitespace-nowrap">Validity</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-700 whitespace-nowrap">Usage</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-700 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">
                    No discounts found
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((discount) => (
                  <tr key={discount.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 w-[48px]">
                      <div className="flex items-center justify-center">
                        <Checkbox 
                          checked={selectedItems.includes(discount.id)}
                          onCheckedChange={() => toggleItem(discount.id)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div>
                        <div className="font-semibold text-black text-[13px]">{discount.code}</div>
                        {discount.description && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{discount.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle capitalize">
                      {discount.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {discount.discount_type === "percentage" 
                        ? `${discount.discount_value}%` 
                        : `$${discount.discount_value.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="text-xs">
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
                    <td className="px-4 py-3 align-middle">
                      <div className="text-xs">
                        {discount.usage_limit ? (
                          <div>{discount.usage_count} / {discount.usage_limit}</div>
                        ) : (
                          <div>{discount.usage_count} / ∞</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        discount.is_active 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {discount.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4 rotate-90" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyCode(discount.code)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Code
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(discount)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(discount)}>
                            <Files className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
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

      {/* View Discount Modal */}
      {viewDiscount && showViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Discount Details</h2>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="font-semibold">Code:</span> {viewDiscount.code}</div>
              <div><span className="font-semibold">Description:</span> {viewDiscount.description || '—'}</div>
              <div><span className="font-semibold">Type:</span> {viewDiscount.discount_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}</div>
              <div><span className="font-semibold">Value:</span> {viewDiscount.discount_type === 'percentage' ? `${viewDiscount.discount_value}%` : `$${viewDiscount.discount_value.toFixed(2)}`}</div>
              <div><span className="font-semibold">Min Purchase:</span> ${viewDiscount.min_purchase_amount.toFixed(2)}</div>
              <div><span className="font-semibold">Max Discount:</span> {viewDiscount.max_discount_amount ? `$${viewDiscount.max_discount_amount.toFixed(2)}` : '—'}</div>
              <div><span className="font-semibold">Validity:</span> {viewDiscount.starts_at ? `From ${format(new Date(viewDiscount.starts_at), 'MMM d, yyyy')}` : ''} {viewDiscount.expires_at ? `Until ${format(new Date(viewDiscount.expires_at), 'MMM d, yyyy')}` : ''} {!viewDiscount.starts_at && !viewDiscount.expires_at && 'No time limit'}</div>
              <div><span className="font-semibold">Usage:</span> {viewDiscount.usage_limit ? `${viewDiscount.usage_count} / ${viewDiscount.usage_limit}` : `${viewDiscount.usage_count} / ∞`}</div>
              <div><span className="font-semibold">Status:</span> {viewDiscount.is_active ? 'Active' : 'Inactive'}</div>
              <div><span className="font-semibold">Applies To:</span> {viewDiscount.applies_to}</div>
              <div><span className="font-semibold">Created:</span> {format(new Date(viewDiscount.created_at), 'MMM d, yyyy')}</div>
              <div><span className="font-semibold">Updated:</span> {format(new Date(viewDiscount.updated_at), 'MMM d, yyyy')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}