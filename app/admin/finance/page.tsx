"use client";

import { AdminButton } from "@/components/ui/admin-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Download, TrendingUp, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { formatPrice, formatDate } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Transaction {
  id: string;
  created_at: string;
  type: string;
  amount: number;
  status: string;
  customer_name: string;
  order_id: string;
  order_number: string;
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
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

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

  // Handle export to CSV
  const exportTransactions = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Transaction ID', 'Date', 'Type', 'Amount', 'Status', 'Customer', 'Order ID'];
    const csvData = transactions.map(t => [
      t.id,
      new Date(t.created_at).toLocaleDateString(),
      t.type,
      t.amount.toFixed(2),
      t.status,
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-semibold mt-1">{formatPrice(stats.totalRevenue)}</p>
                  <div className={`flex items-center mt-2 ${stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.revenueChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 mr-1" />
                    )}
                    <span className="text-sm">{Math.abs(stats.revenueChange).toFixed(1)}% from last period</span>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Average Order Value</p>
                  <p className="text-2xl font-semibold mt-1">{formatPrice(stats.averageOrderValue)}</p>
                  <div className={`flex items-center mt-2 ${stats.aovChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.aovChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 mr-1" />
                    )}
                    <span className="text-sm">{Math.abs(stats.aovChange).toFixed(1)}% from last period</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Total Transactions</p>
                  <p className="text-2xl font-semibold mt-1">{stats.totalTransactions}</p>
                  <div className={`flex items-center mt-2 ${stats.transactionsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.transactionsChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 mr-1" />
                    )}
                    <span className="text-sm">{Math.abs(stats.transactionsChange).toFixed(1)}% from last period</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Recent Transactions</h2>
                <div className="flex items-center gap-4">
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
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredTransactions.length > 0 ? (
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-blue-600">#{transaction.id}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{formatDate(transaction.created_at)}</td>
                        <td className="py-3 px-4 text-sm">{transaction.type}</td>
                        <td className="py-3 px-4 text-sm font-medium">{formatPrice(transaction.amount)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status.toLowerCase() === 'completed' || transaction.status.toLowerCase() === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status.toLowerCase() === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : transaction.status.toLowerCase() === 'failed' || transaction.status.toLowerCase() === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{transaction.customer_name}</td>
                        <td className="py-3 px-4 text-sm text-blue-600">{transaction.order_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {searchQuery ? "No transactions match your search criteria." : "No transactions found for the selected period."}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}