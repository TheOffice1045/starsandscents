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


// Update the order tabs to include "Fulfilled"
const orderTabs = [
 "All Orders",
 "Open",
 "Unfulfilled",
 "Fulfilled", // Added Fulfilled tab
 "Unpaid",
 "Paid Orders",
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
     case "Open":
       return order.is_open;
     case "Unfulfilled":
       return order.fulfillment_status === "unfulfilled";
     case "Fulfilled":
       return order.fulfillment_status === "fulfilled";
     case "Unpaid":
       return order.payment_status !== "paid";
     case "Paid Orders":
       return order.payment_status === "paid";
     default:
       return true;
   }
 });


 useEffect(() => {
   fetchOrders();
 }, [fetchOrders]);


 const handleDeleteOrder = async (orderId: string) => {
   if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
     try {
       const { error } = await supabase
         .from('orders')
         .delete()
         .eq('id', orderId);
      
       if (error) throw error;
      
       toast.success('Order deleted successfully');
       fetchOrders();
     } catch (error) {
       console.error('Error deleting order:', error);
       toast.error('Failed to delete order');
     }
   }
 };


 // Add this function after handleDeleteOrder
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
           label: "Pending Payments",
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
                 {stat.label === "Total Orders" ? "Total Value" :
                  stat.label === "Paid" ? "Total Paid" :
                  stat.label === "Pending Payments" ? "Total Pending" :
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
     <div className="border-b">
       <nav className="-mb-px flex space-x-6 overflow-x-auto">
         {orderTabs.map((tab) => (
           <button
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={`py-3 px-1 text-sm font-medium border-b-2 whitespace-nowrap ${
               tab === activeTab
                 ? "border-[#4A332F] text-[#4A332F]"
                 : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
             }`}
           >
             {tab}
           </button>
         ))}
       </nav>
     </div>


     {/* Search and Filter */}
     <div className="flex flex-col sm:flex-row gap-4">
       <div className="relative flex-1">
         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
         <Input
           placeholder="Search by order ID or customer..."
           className="pl-10 text-sm"
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
         />
       </div>
       <div className="flex gap-2">
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <AdminButton variant="outline" size="sm">
               <Filter className="w-4 h-4 mr-2" />
               {timeFrame === "all" ? "All Time" :
                timeFrame === "today" ? "Today" :
                timeFrame === "yesterday" ? "Yesterday" :
                timeFrame === "last7days" ? "Last 7 Days" :
                timeFrame === "last30days" ? "Last 30 Days" :
                timeFrame === "thisMonth" ? "This Month" :
                timeFrame === "lastMonth" ? "Last Month" : "Filter by Time"}
             </AdminButton>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end" className="w-48">
             <DropdownMenuItem onClick={() => setTimeFrame("all")}>
               All Time
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => setTimeFrame("today")}>
               Today
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => setTimeFrame("yesterday")}>
               Yesterday
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => setTimeFrame("last7days")}>
               Last 7 Days
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => setTimeFrame("last30days")}>
               Last 30 Days
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => setTimeFrame("thisMonth")}>
               This Month
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => setTimeFrame("lastMonth")}>
               Last Month
             </DropdownMenuItem>
           </DropdownMenuContent>
         </DropdownMenu>
         <AdminButton
           variant="outline"
           size="sm"
           onClick={handleExportCSV}
         >
           <Download className="w-4 h-4 mr-2" />
           Export
         </AdminButton>
       </div>
     </div>


     {/* Orders Table */}
     <div className="bg-white rounded-lg shadow-sm border border-gray-200">
       <table className="min-w-full">
         <thead>
           <tr className="bg-gray-50 border-b">
             <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
             <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
             <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
             <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
             <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fulfillment</th>
             <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
             <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
           </tr>
         </thead>
         <tbody className="divide-y divide-gray-200">
           {loading ? (
             <tr>
               <td colSpan={7} className="py-10 text-center text-gray-500">
                 Loading orders...
               </td>
             </tr>
           ) : filteredOrders.length > 0 ? (
             filteredOrders.map((order) => (
               <tr key={order.id} className="hover:bg-gray-50 text-sm">
                 <td className="py-3 px-4">
                   <button
                     onClick={() => router.push(`/admin/orders/${order.id}`)}
                     className="text-blue-600 hover:text-blue-800 font-medium"
                   >
                     {order.order_number}
                   </button>
                 </td>
                 <td className="py-3 px-4 text-gray-500">{formatDate(order.created_at)}</td>
                 <td className="py-3 px-4">{order.customer_name || 'Guest'}</td>
                 <td className="py-3 px-4">
                   <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                     order.payment_status === "paid" ? "bg-green-100 text-green-800" :
                     order.payment_status === "authorized" ? "bg-blue-100 text-blue-800" :
                     "bg-yellow-100 text-yellow-800"
                   }`}>
                     {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                   </span>
                 </td>
                 <td className="py-3 px-4">
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
                 <td className="py-3 px-4 text-right font-medium">${order.total.toFixed(2)}</td>
                 <td className="py-3 px-4 text-right">
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                         <span className="sr-only">Open menu</span>
                         <MoreHorizontal className="h-4 w-4" />
                       </Button>
                     </DropdownMenuTrigger>
                  
                     <DropdownMenuContent align="end">
                       <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}`)}>
                         <Eye className="mr-2 h-4 w-4" />
                         <span>View</span>
                       </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}/edit`)}>
                         <Edit className="mr-2 h-4 w-4" />
                         <span>Edit</span>
                       </DropdownMenuItem>
                       {order.payment_status !== 'paid' && (
                         <DropdownMenuItem onClick={() => handleConfirmPayment(order.id)}>
                           <CheckCircle className="mr-2 h-4 w-4" />
                           <span>Confirm Payment</span>
                         </DropdownMenuItem>
                       )}
                       <DropdownMenuItem
                         className="text-red-600"
                         onClick={() => handleDeleteOrder(order.id)}
                       >
                         <Trash2 className="mr-2 h-4 w-4" />
                         <span>Delete</span>
                       </DropdownMenuItem>
                     </DropdownMenuContent>
                   </DropdownMenu>
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
           {filteredOrders.length > 0 && (
             <tr className="bg-gray-50 font-medium border-t-2 border-gray-300">
               <td colSpan={5} className="py-3 px-4 text-right text-gray-500 text-xs">
                 Order Summary ({filteredOrders.length} orders):
               </td>
               <td className="py-3 px-4 text-right text-black-700 font-bold text-sm">
                 ${filteredOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
               </td>
               <td className="py-3 px-4"></td>
             </tr>
           )}
         </tbody>
       </table>
     </div>


     {/* Pagination */}
     <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
       <div className="flex flex-1 justify-between sm:hidden">
         <Button
           variant="outline"
           size="sm"
           className="hover:bg-gray-100 text-gray-700 hover:text-gray-900 rounded-full"
         >
           Previous
         </Button>
         <Button
           variant="outline"
           size="sm"
           className="hover:bg-gray-100 text-gray-700 hover:text-gray-900 rounded-full"
         >
           Next
         </Button>
       </div>
       <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
         <div>
           <p className="text-sm text-gray-700">
             Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredOrders.length}</span> of{' '}
             <span className="font-medium">{orders.length}</span> results
           </p>
         </div>
         <div>
           <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
             <Button
               variant="outline"
               size="sm"
               className="rounded-l-md"
               disabled={true} // We'll implement pagination logic later
             >
               Previous
             </Button>
             <div className="flex items-center">
               <span className="px-4 text-sm text-gray-700">Page 1 of 1</span>
             </div>
             <Button
               variant="outline"
               size="sm"
               className="rounded-r-md"
               disabled={true} // We'll implement pagination logic later
             >
               Next
             </Button>
           </nav>
         </div>
       </div>
     </div>
   </div>
 );
}

