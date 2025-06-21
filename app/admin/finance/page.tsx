"use client";

import { AdminButton } from "@/components/ui/admin-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Download, TrendingUp, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, Loader2, Check, MoreVertical, Eye, FileText, Calendar, User, ShoppingCart, Copy, Receipt, X } from "lucide-react";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { formatPrice, formatDate } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import Link from "next/link";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";

interface Transaction {
  id: string;
  created_at: string;
  type: string;
  amount: number;
  fee?: number;
  status: string;
  customer_name: string;
  order_id: string;
  order_number: string;
  payment_method?: string;
}

interface FinancialStats {
  totalRevenue: number;
  averageOrderValue: number;
  totalTransactions: number;
  revenueChange: number;
  aovChange: number;
  transactionsChange: number;
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    averageOrderValue: 0,
    totalTransactions: 0,
    revenueChange: 0,
    aovChange: 0,
    transactionsChange: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState("30");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const totalTransactions = transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalTransactions / pageSize));

  // Helper function to get timeframe text
  const getTimeframeText = (periodValue: string) => {
    switch (periodValue) {
      case "7":
        return "vs previous 7 days";
      case "30":
        return "vs previous 30 days";
      case "90":
        return "vs previous 90 days";
      case "365":
        return "vs previous year";
      default:
        return "vs previous period";
    }
  };

  // Helper function to get current period text
  const getCurrentPeriodText = (periodValue: string) => {
    switch (periodValue) {
      case "7":
        return "Last 7 days";
      case "30":
        return "Last 30 days";
      case "90":
        return "Last 90 days";
      case "365":
        return "This year";
      default:
        return "Current period";
    }
  };

  useEffect(() => {
    const fetchFinancialData = async () => {
      setLoading(true);
      try {
        // Calculate date ranges
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(period));
        
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - parseInt(period));
        
        // Format dates for queries
        const startDateStr = startDate.toISOString();
        const endDateStr = endDate.toISOString();
        const previousStartDateStr = previousStartDate.toISOString();
        
        // Fetch orders for current period
        const { data: currentOrders, error: currentOrdersError } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', startDateStr)
          .lte('created_at', endDateStr)
          .order('created_at', { ascending: false });
          
        if (currentOrdersError) throw currentOrdersError;
        
        // Fetch orders for previous period (for comparison)
        const { data: previousOrders, error: previousOrdersError } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', previousStartDateStr)
          .lt('created_at', startDateStr);
          
        if (previousOrdersError) throw previousOrdersError;
        
        // Calculate current period stats
        const currentTotalRevenue = currentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const currentTransactionCount = currentOrders.length;
        const currentAOV = currentTransactionCount > 0 ? currentTotalRevenue / currentTransactionCount : 0;
        
        // Calculate previous period stats
        const previousTotalRevenue = previousOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const previousTransactionCount = previousOrders.length;
        const previousAOV = previousTransactionCount > 0 ? previousTotalRevenue / previousTransactionCount : 0;
        
        // Calculate percentage changes
        const calculatePercentChange = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };
        
        const revenueChange = calculatePercentChange(currentTotalRevenue, previousTotalRevenue);
        const transactionsChange = calculatePercentChange(currentTransactionCount, previousTransactionCount);
        const aovChange = calculatePercentChange(currentAOV, previousAOV);
        
        // Format transactions for display
        const formattedTransactions = currentOrders.map(order => ({
          id: `TRX-${order.id.substring(0, 6)}`,
          created_at: order.created_at,
          type: 'Sale',
          amount: order.total || 0,
          status: order.payment_status || 'Completed',
          customer_name: order.customer_name || 'Guest',
          order_id: order.id,
          order_number: order.order_number || `#${order.id.substring(0, 4)}`
        }));
        
        // Update state with calculated data
        setStats({
          totalRevenue: currentTotalRevenue,
          averageOrderValue: currentAOV,
          totalTransactions: currentTransactionCount,
          revenueChange,
          aovChange,
          transactionsChange
        });
        
        setTransactions(formattedTransactions);
      } catch (error) {
        console.error('Error fetching financial data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFinancialData();
  }, [supabase, period]);

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter(transaction => {
    const searchLower = searchQuery.toLowerCase();
    return (
      transaction.id.toLowerCase().includes(searchLower) ||
      transaction.customer_name.toLowerCase().includes(searchLower) ||
      transaction.order_number.toLowerCase().includes(searchLower) ||
      transaction.status.toLowerCase().includes(searchLower)
    );
  });

  // Paginate filteredTransactions
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Enhanced export function with new columns
  const exportTransactions = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Transaction ID', 'Date & Time', 'Type', 'Amount', 'Fee', 'Net Amount', 'Status', 'Payment Method', 'Customer', 'Order ID'];
    const csvData = transactions.map(t => [
      t.id,
      new Date(t.created_at).toLocaleString(),
      t.type,
      t.amount.toFixed(2),
      (t.fee || 0).toFixed(2),
      ((t.amount - (t.fee || 0))).toFixed(2),
      t.status,
      t.payment_method || 'N/A',
      t.customer_name,
      t.order_number
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  // Helper function to get payment method icon
  const getPaymentMethodIcon = (method?: string) => {
    if (!method) return <CreditCard className="w-4 h-4" />;
    const lowerMethod = method.toLowerCase();
    if (lowerMethod.includes('card') || lowerMethod.includes('visa') || lowerMethod.includes('mastercard')) {
      return <CreditCard className="w-4 h-4" />;
    }
    if (lowerMethod.includes('paypal')) {
      return <DollarSign className="w-4 h-4" />;
    }
    return <CreditCard className="w-4 h-4" />;
  };

  // Helper function to format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Handle copy to clipboard with proper error handling
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`,
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: "Copied!",
          description: `${label} copied to clipboard.`,
        });
      } catch (fallbackErr) {
        toast({
          title: "Error",
          description: "Failed to copy to clipboard.",
          variant: "destructive",
        });
      }
      document.body.removeChild(textArea);
    }
  };

  // Handle view transaction details
  const viewTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsModalOpen(true);
    setOpenDropdown(null);
  };

  // Handle download receipt with actual PDF generation
  const downloadReceipt = async (transaction: Transaction) => {
    try {
      const doc = new jsPDF();
      // Branding/Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Candle Store', 105, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Transaction Receipt', 105, 28, { align: 'center' });
      doc.setLineWidth(0.5);
      doc.line(20, 32, 190, 32);

      // Transaction Info
      let y = 42;
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction ID:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`#${transaction.id}`, 60, y);
      doc.setFont('helvetica', 'bold');
      doc.text('Order ID:', 120, y);
      doc.setFont('helvetica', 'normal');
      doc.text(transaction.order_number, 150, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(transaction.created_at).toLocaleString(), 60, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Customer:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(transaction.customer_name, 60, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Method:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(transaction.payment_method || 'Credit Card', 60, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Type:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(transaction.type, 60, y);
      y += 15;
      doc.setLineWidth(0.1);
      doc.line(20, y, 190, y);
      y += 10;
      // Amounts
      doc.setFont('helvetica', 'bold');
      doc.text('Amount:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatPrice(transaction.amount), 60, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Fee:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(transaction.fee ? formatPrice(transaction.fee) : 'N/A', 60, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Net Amount:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatPrice(transaction.amount - (transaction.fee || 0)), 60, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Status:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(transaction.status, 60, y);
      y += 15;
      doc.setLineWidth(0.1);
      doc.line(20, y, 190, y);
      y += 12;
      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.text('Thank you for your business!', 105, y, { align: 'center' });
      // Save PDF
      doc.save(`receipt-${transaction.id}-${transaction.order_number}.pdf`);
      toast({
        title: "Receipt Downloaded",
        description: `PDF receipt for transaction #${transaction.id} downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF receipt.",
        variant: "destructive",
      });
    }
    setOpenDropdown(null);
  };

  // Close modal
  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTransaction(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-medium">Finance</h1>
        <div className="flex gap-4 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">This year</SelectItem>
            </SelectContent>
          </Select>
          <AdminButton variant="outline" size="sm" onClick={exportTransactions}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </AdminButton>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <Card className="p-5 border-0 bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-200 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-700" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-green-900 font-semibold uppercase tracking-wide">Total Revenue</div>
                  <div className="text-2xl font-bold text-green-900">{formatPrice(stats.totalRevenue)}</div>
                  <div className={`flex items-center mt-1 text-xs ${stats.revenueChange >= 0 ? 'text-green-700' : 'text-red-600'}`}> 
                    {stats.revenueChange >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                    <span>{Math.abs(stats.revenueChange).toFixed(1)}% {getTimeframeText(period)}</span>
                  </div>
                </div>
              </div>
            </Card>
            {/* Average Order Value */}
            <Card className="p-5 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-200 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-700" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-blue-900 font-semibold uppercase tracking-wide">Avg. Order Value</div>
                  <div className="text-2xl font-bold text-blue-900">{formatPrice(stats.averageOrderValue)}</div>
                  <div className={`flex items-center mt-1 text-xs ${stats.aovChange >= 0 ? 'text-green-700' : 'text-red-600'}`}> 
                    {stats.aovChange >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                    <span>{Math.abs(stats.aovChange).toFixed(1)}% {getTimeframeText(period)}</span>
                  </div>
                </div>
              </div>
            </Card>
            {/* Total Transactions */}
            <Card className="p-5 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-200 rounded-full">
                  <CreditCard className="w-6 h-6 text-purple-700" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-purple-900 font-semibold uppercase tracking-wide">Transactions</div>
                  <div className="text-2xl font-bold text-purple-900">{stats.totalTransactions}</div>
                  <div className={`flex items-center mt-1 text-xs ${stats.transactionsChange >= 0 ? 'text-green-700' : 'text-red-600'}`}> 
                    {stats.transactionsChange >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                    <span>{Math.abs(stats.transactionsChange).toFixed(1)}% {getTimeframeText(period)}</span>
                  </div>
                </div>
              </div>
            </Card>
            {/* Paid Orders */}
            <Card className="p-5 border-0 bg-gradient-to-br from-yellow-50 to-yellow-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-200 rounded-full">
                  <Check className="w-6 h-6 text-yellow-700" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-yellow-900 font-semibold uppercase tracking-wide">Paid Orders</div>
                  <div className="text-2xl font-bold text-yellow-900">{transactions.filter(t => t.status.toLowerCase() === 'paid' || t.status.toLowerCase() === 'completed').length}</div>
                  <div className="text-xs text-yellow-800 mt-1">{getCurrentPeriodText(period)}</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Transactions Table Title */}
          <h6 className="text-md font-medium mt-20 mb-1">Recent Transactions</h6>
          {/* Transactions Controls */}
          <div className="flex items-center justify-between mb-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search transactions..."
                className="pl-10 w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <AdminButton variant="outline" size="sm" onClick={exportTransactions}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </AdminButton>
          </div>

          {/* Transactions Table */}
          <Card className="border-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                {paginatedTransactions.length > 0 ? (
                  <table className="w-full" style={{ border: '1px solid #e5e5e5', borderRadius: '12px', overflow: 'hidden' }}>
                    <thead>
                      <tr className="border-b" style={{ background: '#f5f5f5', color: '#0a0a0a' }}>
                        <th className="px-6 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Transaction ID
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Date & Time
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Type</th>
                        <th className="px-6 py-3 text-right align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Amount</th>
                        <th className="px-6 py-3 text-right align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Fee</th>
                        <th className="px-6 py-3 text-right align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Net Amount</th>
                        <th className="px-6 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Status</th>
                        <th className="px-6 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Payment Method
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Customer
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            Order ID
                          </div>
                        </th>
                        <th className="px-6 py-3 text-center align-middle text-sm font-medium whitespace-nowrap" style={{ color: '#0a0a0a' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedTransactions.map((transaction) => {
                        const dateTime = formatDateTime(transaction.created_at);
                        const netAmount = transaction.amount - (transaction.fee || 0);
                        return (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-blue-600 text-left align-middle whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                #{transaction.id}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-left align-middle whitespace-nowrap">
                              <div>
                                <div className="font-medium text-gray-900">{dateTime.date}</div>
                                <div className="text-xs text-gray-500">{dateTime.time}</div>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-left align-middle whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                transaction.type.toLowerCase() === 'payment' || transaction.type.toLowerCase() === 'charge'
                                  ? 'bg-green-100 text-green-800'
                                  : transaction.type.toLowerCase() === 'refund'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {transaction.type}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-right align-middle whitespace-nowrap">
                              <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {transaction.amount >= 0 ? '+' : ''}{formatPrice(transaction.amount)}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm text-right align-middle whitespace-nowrap text-gray-500">
                              {transaction.fee ? formatPrice(transaction.fee) : '-'}
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-right align-middle whitespace-nowrap">
                              <span className={netAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {netAmount >= 0 ? '+' : ''}{formatPrice(netAmount)}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-left align-middle whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                transaction.status.toLowerCase() === 'completed' || transaction.status.toLowerCase() === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : transaction.status.toLowerCase() === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : transaction.status.toLowerCase() === 'failed' || transaction.status.toLowerCase() === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : transaction.status.toLowerCase() === 'processing'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  transaction.status.toLowerCase() === 'completed' || transaction.status.toLowerCase() === 'paid'
                                    ? 'bg-green-500'
                                    : transaction.status.toLowerCase() === 'pending'
                                    ? 'bg-yellow-500'
                                    : transaction.status.toLowerCase() === 'failed' || transaction.status.toLowerCase() === 'cancelled'
                                    ? 'bg-red-500'
                                    : transaction.status.toLowerCase() === 'processing'
                                    ? 'bg-blue-500'
                                    : 'bg-gray-500'
                                }`}></div>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm text-left align-middle whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getPaymentMethodIcon(transaction.payment_method)}
                                <span className="text-gray-700">{transaction.payment_method || 'Credit Card'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-left align-middle whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                  <User className="w-3 h-3 text-gray-600" />
                                </div>
                                <span className="font-medium text-gray-900">{transaction.customer_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-blue-600 text-left align-middle whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4" />
                                {transaction.order_number ? (
                                  <Link href={`/admin/orders/${transaction.order_id}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-700 font-normal">
                                    {transaction.order_number}
                                  </Link>
                                ) : (
                                  <span>{transaction.order_number}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-center align-middle whitespace-nowrap">
                              <DropdownMenu open={openDropdown === transaction.id} onOpenChange={(open) => setOpenDropdown(open ? transaction.id : null)}>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                    <MoreVertical className="w-4 h-4 text-gray-500" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => viewTransactionDetails(transaction)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => downloadReceipt(transaction)}>
                                    <Receipt className="w-4 h-4 mr-2" />
                                    Download Receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => copyToClipboard(transaction.id, "Transaction ID")}>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Transaction ID
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => copyToClipboard(transaction.order_number, "Order ID")}>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Order ID
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    {searchQuery ? "No transactions match your search criteria." : "No transactions found for the selected period."}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pagination Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
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
                {totalTransactions} total items
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
        </>
      )}

      {/* Transaction Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl admin-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-lg font-semibold">#{selectedTransaction.id}</h3>
                  <p className="text-sm text-gray-600">{selectedTransaction.order_number}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedTransaction.status.toLowerCase() === 'completed' || selectedTransaction.status.toLowerCase() === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : selectedTransaction.status.toLowerCase() === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : selectedTransaction.status.toLowerCase() === 'failed' || selectedTransaction.status.toLowerCase() === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedTransaction.status}
                </span>
              </div>

              {/* Transaction Information */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date & Time</label>
                    <p className="text-sm">{new Date(selectedTransaction.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Customer</label>
                    <p className="text-sm">{selectedTransaction.customer_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Method</label>
                    <p className="text-sm">{selectedTransaction.payment_method || 'Credit Card'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Transaction Type</label>
                    <p className="text-sm">{selectedTransaction.type}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <p className="text-lg font-semibold">{formatPrice(selectedTransaction.amount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fee</label>
                    <p className="text-sm">{selectedTransaction.fee ? formatPrice(selectedTransaction.fee) : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Net Amount</label>
                    <p className="text-lg font-semibold text-green-600">
                      {formatPrice(selectedTransaction.amount - (selectedTransaction.fee || 0))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <AdminButton 
                  onClick={() => downloadReceipt(selectedTransaction)}
                  variant="outline"
                  className="flex-1"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Download Receipt
                </AdminButton>
                <AdminButton 
                  onClick={() => copyToClipboard(selectedTransaction.id, "Transaction ID")}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Transaction ID
                </AdminButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}