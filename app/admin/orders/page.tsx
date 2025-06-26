"use client";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Filter, RefreshCcw, ShoppingBag, Clock, Package, CheckCircle, Plus, PackageCheck, Banknote, LucideBanknote, Landmark, PackageX } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/ui/admin-button";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { AdminEllipsisMenu } from '@/components/admin/AdminEllipsisMenu';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';


// Update the order tabs to include "Fulfilled"
const orderTabs = [
 "All Orders",
 "Unfulfilled",
 "Fulfilled", // Added Fulfilled tab
 "Unpaid",
 "Paid",
] as const;


type OrderTab = typeof orderTabs[number];


type Order = {
 id: string;
 order_number: string;
 created_at: string;
 customer_name: string | null;
 payment_status: string;
 fulfillment_status: string;
 total: number;
 is_open: boolean;
};


export default function OrdersPage() {
 const router = useRouter();
 const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [activeTab, setActiveTab] = useState<OrderTab>("All Orders");
 const [searchQuery, setSearchQuery] = useState("");
 const [isRefreshing, setIsRefreshing] = useState(false);
 const [orders, setOrders] = useState<Order[]>([]);
 const [loading, setLoading] = useState(true);
 // Add timeframe state
 const [timeFrame, setTimeFrame] = useState<string>("all");
 // Update the stats state to include the paid property
 const [stats, setStats] = useState({
   total: 0,
   pending: 0,
   processing: 0,
   fulfilled: 0,
   paid: 0,
   totalAmount: 0,
   pendingAmount: 0,
   unfulfilledAmount: 0,
   fulfilledAmount: 0,
   paidAmount: 0
 });
 const [currentPage, setCurrentPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [orderToDelete, setOrderToDelete] = useState<string | null>(null);


 // First, let's calculate the totals for each category in the fetchOrders function
 const fetchOrders = useCallback(async () => {
   setIsRefreshing(true);
   try {
     const { data, error } = await supabase
       .from('orders')
       .select('*')
       .order('created_at', { ascending: false });
    
     if (error) {
       console.error('Supabase error details:', error.message, error.details, error.hint);
       throw error;
     }
    
     setOrders(data || []);
    
     // Calculate stats
     const total = data?.length || 0;
     const pending = data?.filter(order => order.payment_status === 'pending').length || 0;
     const unfulfilled = data?.filter(order => order.fulfillment_status === 'unfulfilled').length || 0;
     const fulfilled = data?.filter(order => order.fulfillment_status === 'fulfilled').length || 0;
     const paid = data?.filter(order => order.payment_status === 'paid').length || 0;
    
     // Calculate totals for each category
     const totalAmount = data?.reduce((sum, order) => sum + order.total, 0) || 0;
     const pendingAmount = data?.filter(order => order.payment_status === 'pending')
       .reduce((sum, order) => sum + order.total, 0) || 0;
     const unfulfilledAmount = data?.filter(order => order.fulfillment_status === 'unfulfilled')
       .reduce((sum, order) => sum + order.total, 0) || 0;
     const fulfilledAmount = data?.filter(order => order.fulfillment_status === 'fulfilled')
       .reduce((sum, order) => sum + order.total, 0) || 0;
     const paidAmount = data?.filter(order => order.payment_status === 'paid')
       .reduce((sum, order) => sum + order.total, 0) || 0;
    
     setStats({
       total,
       pending,
       processing: unfulfilled,
       fulfilled,
       paid,
       totalAmount,
       pendingAmount,
       unfulfilledAmount,
       fulfilledAmount,
       paidAmount
     });
    
   } catch (error: any) {
     console.error('Error fetching orders:', error?.message || error);
    
     // If the error is related to the table not existing, show a more helpful message
     if (error?.message?.includes('does not exist') || error?.details?.includes('does not exist')) {
       toast.error('Orders table does not exist. Please create the database schema first.');
     } else {
       toast.error('Failed to load orders: ' + (error?.message || 'Unknown error'));
     }
    
     // Set empty orders as fallback
     setOrders([]);
   } finally {
     setLoading(false);
     setIsRefreshing(false);
   }
 }, [supabase]);


 useEffect(() => {
   fetchOrders();
 }, [fetchOrders]);


 const handleRefresh = () => {
   fetchOrders();
 };


 const formatDate = (dateString: string) => {
   try {
     const date = new Date(dateString);
     return formatDistanceToNow(date, { addSuffix: true });
   } catch (e) {
     return dateString;
   }
 };


 // Add a function to filter orders by time frame
 const filterOrdersByTimeFrame = (orders: Order[]) => {
   if (timeFrame === "all") return orders;
  
   const now = new Date();
   let startDate: Date;
  
   switch (timeFrame) {
     case "today":
       startDate = new Date(now.setHours(0, 0, 0, 0));
       break;
     case "yesterday":
       startDate = new Date(now);
       startDate.setDate(startDate.getDate() - 1);
       startDate.setHours(0, 0, 0, 0);
       break;
     case "last7days":
       startDate = new Date(now);
       startDate.setDate(startDate.getDate() - 7);
       break;
     case "last30days":
       startDate = new Date(now);
       startDate.setDate(startDate.getDate() - 30);
       break;
     case "thisMonth":
       startDate = new Date(now.getFullYear(), now.getMonth(), 1);
       break;
     case "lastMonth":
       startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
       const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
       const endDate = new Date(now.getFullYear(), now.getMonth() - 1, lastDayOfLastMonth, 23, 59, 59);
       return orders.filter(order => {
         const orderDate = new Date(order.created_at);
         return orderDate >= startDate && orderDate <= endDate;
       });
     default:
       return orders;
   }
  
   return orders.filter(order => new Date(order.created_at) >= startDate);
 };


 // Filter orders by time frame first
 const timeFilteredOrders = filterOrdersByTimeFrame(orders);
  // Calculate stats based on time-filtered orders
 const filteredStats = {
   total: timeFilteredOrders.length,
   pending: timeFilteredOrders.filter(order => order.payment_status === 'pending').length,
   processing: timeFilteredOrders.filter(order => order.fulfillment_status === 'unfulfilled').length,
   fulfilled: timeFilteredOrders.filter(order => order.fulfillment_status === 'fulfilled').length,
   paid: timeFilteredOrders.filter(order => order.payment_status === 'paid').length,
   totalAmount: timeFilteredOrders.reduce((sum, order) => sum + order.total, 0),
   pendingAmount: timeFilteredOrders.filter(order => order.payment_status === 'pending')
     .reduce((sum, order) => sum + order.total, 0),
   unfulfilledAmount: timeFilteredOrders.filter(order => order.fulfillment_status === 'unfulfilled')
     .reduce((sum, order) => sum + order.total, 0),
   fulfilledAmount: timeFilteredOrders.filter(order => order.fulfillment_status === 'fulfilled')
     .reduce((sum, order) => sum + order.total, 0),
   paidAmount: timeFilteredOrders.filter(order => order.payment_status === 'paid')
     .reduce((sum, order) => sum + order.total, 0)
 };


 // Then apply additional filters for the table display
 const filteredOrders = timeFilteredOrders.filter(order => {
   if (searchQuery) {
     const query = searchQuery.toLowerCase();
     return (
       order.order_number?.toLowerCase().includes(query) ||
       (order.customer_name && order.customer_name.toLowerCase().includes(query))
     );
   }


   switch (activeTab) {
     case "Unfulfilled":
       return order.fulfillment_status === "unfulfilled";
     case "Fulfilled":
       return order.fulfillment_status === "fulfilled";
     case "Unpaid":
       return order.payment_status !== "paid";
     case "Paid":
       return order.payment_status === "paid";
     default:
       return true;
   }
 });


 useEffect(() => {
   fetchOrders();
 }, [fetchOrders]);


 const handleDeleteOrder = async (orderId: string) => {
   try {
     const { error } = await supabase
       .from('orders')
       .delete()
       .eq('id', orderId);
     
     if (error) throw error;
     
     toast.success('Order deleted successfully');
     fetchOrders(); // Refresh the orders list
   } catch (error: any) {
     console.error('Error deleting order:', error);
     toast.error('Failed to delete order');
   }
 };


 const handleEditOrder = (orderId: string) => {
   router.push(`/admin/orders/${orderId}/edit`);
 };


 const handleConfirmPayment = async (orderId: string) => {
   try {
     const { error } = await supabase
       .from('orders')
       .update({ payment_status: 'paid' })
       .eq('id', orderId);
    
     if (error) throw error;
    
     toast.success('Payment confirmed successfully');
     fetchOrders(); // Refresh the orders list
   } catch (error) {
     console.error('Error confirming payment:', error);
     toast.error('Failed to confirm payment');
   }
 };


 // Add this function before the return statement
 const handleExportCSV = () => {
   // Only export if we have orders
   if (filteredOrders.length === 0) {
     toast.error("No orders to export");
     return;
   }


   // Create CSV headers
   const headers = [
     "Order Number",
     "Date",
     "Customer",
     "Payment Status",
     "Fulfillment Status",
     "Total"
   ];


   // Convert orders to CSV rows
   const csvRows = [
     headers.join(","), // Header row
     ...filteredOrders.map(order => [
       order.order_number,
       new Date(order.created_at).toLocaleDateString(),
       order.customer_name || "Guest",
       order.payment_status,
       order.fulfillment_status,
       `$${order.total.toFixed(2)}`
     ].join(","))
   ];


   // Combine rows into a single CSV string
   const csvString = csvRows.join("\n");
  
   // Create a blob and download link
   const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
   const url = URL.createObjectURL(blob);
   const link = document.createElement("a");
  
   // Set up and trigger download
   link.setAttribute("href", url);
   link.setAttribute("download", `orders-export-${new Date().toISOString().split('T')[0]}.csv`);
   link.style.visibility = "hidden";
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
  
   toast.success("Export successful");
 };


 const columns = [
   { key: 'order_number', label: 'Order', width: '120px', sticky: true, render: (row: Order) => row.order_number },
   { key: 'created_at', label: 'Date', width: '160px', render: (row: Order) => formatDate(row.created_at) },
   { key: 'customer_name', label: 'Customer', width: '180px', render: (row: Order) => row.customer_name || 'Guest' },
   { key: 'payment_status', label: 'Payment', width: '120px', render: (row: Order) => row.payment_status },
   { key: 'fulfillment_status', label: 'Fulfillment', width: '120px', render: (row: Order) => row.fulfillment_status },
   { key: 'total', label: 'Total', width: '100px', align: 'right', render: (row: Order) => `$${row.total.toFixed(2)}` },
   { key: 'actions', label: 'Actions', width: '100px', align: 'right', render: (row: Order) => (
     <AdminEllipsisMenu>
       <DropdownMenuItem onClick={() => router.push(`/admin/orders/${row.id}`)}>
         Fulfill
       </DropdownMenuItem>
       {row.fulfillment_status !== 'fulfilled' && (
         <DropdownMenuItem onClick={() => handleEditOrder(row.id)}>
           Edit
         </DropdownMenuItem>
       )}
       <DropdownMenuItem onClick={() => openDeleteDialog(row.id)} className="text-red-600">
         Delete
       </DropdownMenuItem>
     </AdminEllipsisMenu>
   ) },
 ];


 // Calculate paginated orders
 const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
 const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);


 const openDeleteDialog = (orderId: string) => {
   setOrderToDelete(orderId);
   setDeleteDialogOpen(true);
 };
 const closeDeleteDialog = () => {
   setDeleteDialogOpen(false);
 };
 const confirmDeleteOrder = async () => {
   if (orderToDelete) {
     await handleDeleteOrder(orderToDelete);
     closeDeleteDialog();
   }
 };


 return (
   <div className="space-y-6">
     <div className="flex justify-between items-center">
       <h1 className="text-xl font-medium">Orders</h1>
       <div className="flex gap-2">
         <AdminButton
           onClick={handleRefresh}
           variant="outline"
           size="sm"
         >
           <RefreshCcw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
           Refresh
         </AdminButton>
         <AdminButton
           size="sm"
           onClick={() => router.push('/admin/orders/create')}
         >
           <Plus className="mr-2 h-4 w-4" />
           Create order
         </AdminButton>
       </div>
     </div>


    
     {/* Order Stats */}
     <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
       {[
         {
           label: "Total Orders",
           value: filteredStats.total.toString(),
           amount: filteredStats.totalAmount || 0,
           icon: ShoppingBag,
           color: "text-blue-600",
           bgColor: "bg-blue-50"
         },
        
         {
           label: "Paid",
           value: filteredStats.paid.toString(),
           amount: filteredStats.paidAmount || 0,
           icon: Landmark,
           color: "text-green-600",
           bgColor: "bg-green-50"
         },
         {
           label: "Pending",
           value: filteredStats.pending.toString(),
           amount: filteredStats.pendingAmount || 0,
           icon: Banknote,
           color: "text-yellow-600",
           bgColor: "bg-yellow-50"
         },
         {
           label: "Fulfilled",
           value: filteredStats.fulfilled.toString(),
           amount: filteredStats.fulfilledAmount || 0,
           icon: PackageCheck,
           color: "text-green-600",
           bgColor: "bg-green-50"
         },
         {
           label: "Unfulfilled",
           value: filteredStats.processing.toString(),
           amount: filteredStats.unfulfilledAmount || 0,
           icon: PackageX,
           color: "text-red-600",
           bgColor: "bg-purple-50"
         },
       
       ].map((stat) => (
         <div key={stat.label} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
           <div className="flex items-center justify-between mb-3">
             <p className="text-sm font-medium text-gray-600">{stat.label}</p>
             <div className={`p-2.5 rounded-full ${stat.bgColor}`}>
               <stat.icon className={`w-5 h-5 ${stat.color}`} />
             </div>
           </div>
           <div className="flex justify-between items-end">
             <p className="text-3xl font-bold">{stat.value}</p>
             <div className="flex flex-col items-end">
               <p className="text-sm font-medium text-gray-700">${stat.amount.toFixed(2)}</p>
               <p className="text-xs text-gray-500">
                 {stat.label === "Total Orders" ? "Total Orders" :
                  stat.label === "Paid" ? "Total Paid" :
                  stat.label === "Pending" ? "Total Pending" :
                  stat.label === "Fulfilled" ? "Total Fulfilled" :
                  stat.label === "Unfulfilled" ? "Total Unfulfilled" :
                  "Total Value"}
               </p>
             </div>
           </div>
         </div>
       ))}
     </div>


     {/* Tabs */}
     <div className="flex items-center justify-between mt-2 mb-4">
       <ToggleGroup
         type="single"
         value={activeTab}
         onValueChange={val => val && setActiveTab(val as OrderTab)}
         className="bg-[#f5f5f5] p-1 rounded-xl font-waldenburg text-[13px] h-10"
         aria-label="Order status tabs"
       >
         {orderTabs.map(tab => (
           <ToggleGroupItem
             key={tab}
             value={tab}
             className={
               `px-2 py-0.5 font-waldenburg text-[13px] transition-all
               ${activeTab === tab
                 ? '!bg-white shadow border-none text-gray-900 rounded-lg h-8 min-w-[80px] z-10'
                 : 'bg-transparent text-[#0a0a0a] hover:bg-white hover:text-gray-900 border border-transparent rounded-lg h-8 min-w-[80px]'}
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300`
             }
             style={{ fontWeight: 500 }}
           >
             {tab}
           </ToggleGroupItem>
         ))}
       </ToggleGroup>
     </div>


     {/* Search and Filter */}
     <div className="flex gap-4 items-center">
       <div className="relative flex-1">
         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
         <Input
           placeholder="Search by order ID or customer..."
           className="pl-10 h-9 text-sm"
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
         />
       </div>
       <select
         className="border rounded px-2 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
         value={timeFrame}
         onChange={e => setTimeFrame(e.target.value)}
       >
         <option value="all">All Time</option>
         <option value="today">Today</option>
         <option value="yesterday">Yesterday</option>
         <option value="last7days">Last 7 Days</option>
         <option value="last30days">Last 30 Days</option>
         <option value="thisMonth">This Month</option>
         <option value="lastMonth">Last Month</option>
       </select>
       <AdminButton
         variant="outline"
         size="sm"
         className="h-9 px-4 py-2 rounded-md font-normal"
         onClick={handleExportCSV}
       >
         Export
       </AdminButton>
     </div>


     {/* Orders Table */}
     <div>
       <table className="min-w-full">
         <thead>
           <tr className="border-b" style={{ background: '#f5f5f5', color: '#0a0a0a' }}>
             <th className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Order</th>
             <th className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Date</th>
             <th className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Customer</th>
             <th className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Payment</th>
             <th className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Fulfillment</th>
             <th className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Total</th>
             <th className="px-10 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Actions</th>
           </tr>
         </thead>
         <tbody className="divide-y divide-gray-200">
           {loading ? (
             <tr>
               <td colSpan={7} className="py-10 text-center text-gray-500">
                 Loading orders...
               </td>
             </tr>
           ) : paginatedOrders.length > 0 ? (
             paginatedOrders.map((order) => (
               <tr key={order.id} className="hover:bg-gray-50 text-sm align-middle">
                 <td className="py-3 px-10 text-left align-middle">
                   <button
                     onClick={() => router.push(`/admin/orders/${order.id}`)}
                     className="text-gray-700 hover:text-gray-700 hover:underline font-medium text-sm "
                   >
                     {order.order_number}
                   </button>
                 </td>
                 <td className="py-3 px-10 text-left align-middle text-gray-500">{formatDate(order.created_at)}</td>
                 <td className="py-3 px-10 text-left align-middle">{order.customer_name || 'Guest'}</td>
                 <td className="py-3 px-10 text-left align-middle">
                   <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                     order.payment_status === "paid" ? "bg-green-100 text-green-800" :
                     order.payment_status === "authorized" ? "bg-blue-100 text-blue-800" :
                     "bg-yellow-100 text-yellow-800"
                   }`}>
                     {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                   </span>
                 </td>
                 <td className="py-3 px-10 text-left align-middle">
                   <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                     order.fulfillment_status === "unfulfilled" ? "bg-yellow-100 text-yellow-800" :
                     order.fulfillment_status === "partially_fulfilled" ? "bg-orange-100 text-orange-800" :
                     "bg-green-100 text-green-800"
                   }`}>
                     {order.fulfillment_status.split('_').map(word =>
                       word.charAt(0).toUpperCase() + word.slice(1)
                     ).join(' ')}
                   </span>
                 </td>
                 <td className="py-3 px-10 text-left align-middle font-normal">${order.total.toFixed(2)}</td>
                 <td className="py-3 px-10 text-left align-middle">
                   <AdminEllipsisMenu>
                     <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}`)}>
                       Fulfill
                     </DropdownMenuItem>
                     {order.fulfillment_status !== 'fulfilled' && (
                       <DropdownMenuItem onClick={() => handleEditOrder(order.id)}>
                         Edit
                       </DropdownMenuItem>
                     )}
                     <DropdownMenuItem onClick={() => openDeleteDialog(order.id)} className="text-red-600">
                       Delete
                     </DropdownMenuItem>
                   </AdminEllipsisMenu>
                 </td>
               </tr>
             ))
           ) : (
             <tr>
               <td colSpan={7} className="py-10 text-center text-gray-500">
                 No orders found
               </td>
             </tr>
           )}
           {/* Summary row for totals */}
           {paginatedOrders.length > 0 && (
             <tr className="bg-gray-50 font-medium border-t-2 border-gray-300">
               <td colSpan={5} className="py-3 px-10 text-left text-gray-500 text-xs">
                 Order Summary ({paginatedOrders.length} orders):
               </td>
               <td className="py-3 px-10 text-left text-black-700 font-medium text-sm">
                 ${paginatedOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
               </td>
               <td className="py-3 px-10"></td>
             </tr>
           )}
         </tbody>
       </table>
     </div>


     {/* Pagination */}
     <div className="mt-4 flex items-center justify-between">
       <div className="flex items-center gap-4">
         <Select
           value={pageSize.toString()}
           onValueChange={(value) => {
             setPageSize(Number(value));
             setCurrentPage(1); // Reset to first page when changing page size
           }}
         >
           <SelectTrigger className="h-9 w-[120px]">
             <SelectValue>{pageSize} per page</SelectValue>
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="10">10 per page</SelectItem>
             <SelectItem value="25">25 per page</SelectItem>
             <SelectItem value="50">50 per page</SelectItem>
             <SelectItem value="100">100 per page</SelectItem>
           </SelectContent>
         </Select>
         <div className="text-sm text-muted-foreground">
           {filteredOrders.length} total orders
         </div>
       </div>
       <div className="flex items-center space-x-6 lg:space-x-8">
         <div className="flex w-[100px] items-center justify-center text-sm font-medium">
           Page {currentPage} of {totalPages}
         </div>
         <div className="flex items-center space-x-2">
           <AdminButton
             variant="outline"
             size="sm"
             className="h-9 px-4 py-2 rounded-md"
             onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
             disabled={currentPage === 1}
           >
             Previous
           </AdminButton>
           <AdminButton
             variant="outline"
             size="sm"
             className="h-9 px-4 py-2 rounded-md"
             onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
             disabled={currentPage === totalPages}
           >
             Next
           </AdminButton>
         </div>
       </div>
     </div>

     <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
       setDeleteDialogOpen(open);
       if (!open) setOrderToDelete(null);
     }}>
       <AlertDialogContent>
         <AlertDialogHeader>
           <AlertDialogTitle>Delete Order</AlertDialogTitle>
           <AlertDialogDescription>
             Are you sure you want to delete this order? This action cannot be undone.
           </AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
           <AdminButton variant="outline" onClick={closeDeleteDialog}>
             Cancel
           </AdminButton>
           <AdminButton variant="destructive" onClick={confirmDeleteOrder}>
             Delete
           </AdminButton>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
   </div>
 );
}

