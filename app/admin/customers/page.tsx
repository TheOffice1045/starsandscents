"use client";

import { toast } from "sonner";
import { exportToCSV } from "@/lib/utils/export";
import { useState, useEffect, useRef } from "react";
import { AddCustomerModal } from "@/components/admin/AddCustomerModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Plus, Upload, X, Filter, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { parseCSV } from "@/lib/utils/import";
import { ImportDialog } from "@/components/admin/ImportDialog";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { AdminButton } from "@/components/ui/admin-button";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

export default function CustomersPage() {
  const router = useRouter();
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      
      try {
        let query = supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });
        
        // Apply search filter if provided
        if (searchQuery) {
          query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        // Transform data to match the UI format with additional fields
        const formattedCustomers = data.map(customer => ({
          id: customer.id,
          name: `${customer.first_name} ${customer.last_name}`,
          email: customer.email,
          emailSubscription: customer.email_subscription ? "Subscribed" : "Not subscribed",
          location: customer.country || "Unknown",
          address: customer.address || "N/A",
          phone: customer.phone || "N/A",
          orders: customer.total_orders.toString(),
          amountSpent: customer.total_spent.toFixed(2),
          dateJoined: customer.created_at ? format(new Date(customer.created_at), 'MMM dd, yyyy') : "N/A",
          lastUpdated: customer.updated_at ? format(new Date(customer.updated_at), 'MMM dd, yyyy') : "N/A"
        }));
        
        setCustomers(formattedCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error('Failed to load customers');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomers();
  }, [searchQuery]);

  const handleImport = async (file: File) => {
    try {
      const importedData = await parseCSV(file);
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      
      // Transform CSV data to match database schema
      const customersToInsert = importedData.map(customer => ({
        first_name: customer.name?.split(' ')[0] || '',
        last_name: customer.name?.split(' ').slice(1).join(' ') || '',
        email: customer.email || '',
        email_subscription: customer.emailSubscription === 'Subscribed',
        country: customer.location || '',
        total_orders: parseInt(customer.orders || '0'),
        total_spent: parseFloat(customer.amountSpent || '0')
      }));
      
      // Insert customers into Supabase
      const { data, error } = await supabase
        .from('customers')
        .insert(customersToInsert)
        .select();
      
      if (error) {
        throw error;
      }
      
      // Refresh the customer list
      const { data: updatedCustomers, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Transform data to match the UI format
      const formattedCustomers = updatedCustomers.map(customer => ({
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        emailSubscription: customer.email_subscription ? "Subscribed" : "Not subscribed",
        location: customer.country || "Unknown",
        orders: customer.total_orders.toString(),
        amountSpent: customer.total_spent.toFixed(2)
      }));
      
      setCustomers(formattedCustomers);
      toast.success(`${customersToInsert.length} customers imported successfully`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import customers');
    }
  };

  const handleExport = () => {
    try {
      const customersToExport = selectedCustomers.length > 0
        ? customers.filter(c => selectedCustomers.includes(c.id))
        : customers;

      exportToCSV(customersToExport, 'customers');
      toast.success(`${customersToExport.length} customers exported successfully`);
    } catch (error) {
      toast.error('Failed to export customers');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(customers.map(customer => customer.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers(prev => [...prev, customerId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
    }
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    emailSubscription: true,
    location: true,
    orders: true,
    amountSpent: true,
    phone: false,
    address: false,
    dateJoined: true,
    lastUpdated: true
  });
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle column visibility
  const toggleColumn = (column: string) => {
    // Don't allow toggling of required columns
    if (['name', 'email', 'emailSubscription', 'orders', 'dateJoined', 'lastUpdated'].includes(column)) {
      return;
    }
    
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column as keyof typeof prev]
    }));
  };

  // Handle delete customer
  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      
      if (error) {
        throw error;
      }
      
      // Remove from local state
      setCustomers(prev => prev.filter(customer => customer.id !== customerId));
      
      // Remove from selected if present
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
      
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-xl font-medium">Customers</h1>
        </div>
        <div>
          <Link href="/admin/customers/new">
            <AdminButton size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </AdminButton>
          </Link>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <Input 
            type="search" 
            placeholder="Search customers" 
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-2.5 top-2.5 h-5 w-5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={filterRef}>
            <AdminButton 
              variant="outline" 
              size="sm" 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Column Filter
            </AdminButton>
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border rounded-md shadow-lg z-30 p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-sm">Show/Hide Columns</h3>
                  <button 
                    onClick={() => setIsFilterOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="col-name" 
                      checked={visibleColumns.name} 
                      disabled={true}
                    />
                    <label htmlFor="col-name" className="text-sm font-medium">Customer name</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="col-email" 
                      checked={visibleColumns.email} 
                      disabled={true}
                    />
                    <label htmlFor="col-email" className="text-sm font-medium">Email</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="col-emailSubscription" 
                      checked={visibleColumns.emailSubscription} 
                      disabled={true}
                    />
                    <label htmlFor="col-emailSubscription" className="text-sm font-medium">Email subscription</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="col-location" 
                      checked={visibleColumns.location} 
                      onCheckedChange={() => toggleColumn('location')}
                    />
                    <label htmlFor="col-location" className="text-sm font-medium">Location</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="col-orders" 
                      checked={visibleColumns.orders} 
                      disabled={true}
                    />
                    <label htmlFor="col-orders" className="text-sm font-medium">Orders</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="col-amountSpent" 
                      checked={visibleColumns.amountSpent} 
                      onCheckedChange={() => toggleColumn('amountSpent')}
                    />
                    <label htmlFor="col-amountSpent" className="text-sm font-medium">Amount spent</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="col-phone" 
                      checked={visibleColumns.phone} 
                      onCheckedChange={() => toggleColumn('phone')}
                    />
                    <label htmlFor="col-phone" className="text-sm font-medium">Phone</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="col-address" 
                      checked={visibleColumns.address} 
                      onCheckedChange={() => toggleColumn('address')}
                    />
                    <label htmlFor="col-address" className="text-sm font-medium">Address</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="col-dateJoined" 
                      checked={visibleColumns.dateJoined} 
                      disabled={true}
                    />
                    <label htmlFor="col-dateJoined" className="text-sm font-medium">Date joined</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="col-lastUpdated" 
                      checked={visibleColumns.lastUpdated} 
                      disabled={true}
                    />
                    <label htmlFor="col-lastUpdated" className="text-sm font-medium">Last updated</label>
                  </div>
                </div>
              </div>
            )}
          </div>
          <AdminButton variant="outline" size="sm" onClick={handleExport}>
            <Upload className="w-4 h-4 mr-2" />
            Export
          </AdminButton>
          <AdminButton variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            Import
          </AdminButton>
        </div>
      </div>

      <div className="bg-white rounded-xl border admin-table overflow-x-auto">
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full min-w-[900px] table-fixed admin-table text-[13px] font-normal" style={{ fontFamily: "'Waldenburg', system-ui, sans-serif" }}>
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-gray-50">
                <th className="w-12 px-4 py-3 sticky left-0 z-20 bg-gray-50">
                  <Checkbox 
                    checked={selectedCustomers.length === customers.length && customers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-12 z-20 w-[200px] bg-gray-50">Customer name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[250px] bg-gray-50">Email</th>
                {visibleColumns.emailSubscription && (
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[160px] bg-gray-50">Email subscription</th>
                )}
                {visibleColumns.location && (
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[140px] bg-gray-50">Location</th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[120px] bg-gray-50">Orders</th>
                {visibleColumns.amountSpent && (
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 w-[140px] bg-gray-50">Amount spent</th>
                )}
                {visibleColumns.phone && (
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[140px] bg-gray-50">Phone</th>
                )}
                {visibleColumns.address && (
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[200px] bg-gray-50">Address</th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[140px] bg-gray-50">Date joined</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[140px] bg-gray-50">Last updated</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[80px] sticky right-0 z-20 bg-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center p-8">Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center p-8">No customers found</td>
                </tr>
              ) : (
                customers.map(customer => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50 group">
                    <td className="p-4 sticky left-0 z-20 relative">
                      <div className="bg-white h-full w-full absolute inset-0 z-[-1] group-hover:bg-gray-50"></div>
                      <Checkbox 
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={(checked) => 
                          handleSelectCustomer(customer.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="p-4 text-sm font-medium sticky left-12 z-20 truncate relative">
                      <div className="bg-white h-full w-full absolute inset-0 z-[-1] group-hover:bg-gray-50"></div>
                      <Link href={`/admin/customers/${customer.id}`} className="hover:text-primary">
                        {customer.name}
                      </Link>
                    </td>
                    <td className="p-4 text-sm truncate">{customer.email}</td>
                    {visibleColumns.emailSubscription && (
                      <td className="p-4 text-gray-500 text-sm">{customer.emailSubscription}</td>
                    )}
                    {visibleColumns.location && (
                      <td className="p-4 text-sm truncate">{customer.location}</td>
                    )}
                    <td className="p-4 text-sm">{customer.orders} orders</td>
                    {visibleColumns.amountSpent && (
                      <td className="p-4 text-right text-sm">${customer.amountSpent}</td>
                    )}
                    {visibleColumns.phone && (
                      <td className="p-4 text-sm">{customer.phone}</td>
                    )}
                    {visibleColumns.address && (
                      <td className="p-4 text-sm truncate">{customer.address}</td>
                    )}
                    <td className="p-4 text-sm">{customer.dateJoined}</td>
                    <td className="p-4 text-sm">{customer.lastUpdated}</td>
                    <td className="p-4 text-center sticky right-0 z-20 relative">
                      <div className="bg-white h-full w-full absolute inset-0 z-[-1] group-hover:bg-gray-50"></div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded-md hover:bg-gray-100">
                            <MoreHorizontal className="h-4 w-4 text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/customers/${customer.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the customer
                                  and remove their data from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-red-600 hover:bg-red-700 text-white hover:text-white"
                                  onClick={() => handleDeleteCustomer(customer.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-2 text-xs text-gray-500 border-t flex items-center justify-between">
          <span>Showing {customers.length} customers</span>
          <span>→ Scroll Right to view more</span>
        </div>
      </div>

      <ImportDialog 
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />
      <AddCustomerModal 
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
      />
    </div>
  );
}