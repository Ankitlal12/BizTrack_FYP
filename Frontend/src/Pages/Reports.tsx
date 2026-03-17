import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Layout from '../layout/Layout';
import { salesAPI, inventoryAPI, customersAPI, purchasesAPI } from '../services/api';
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, 
  Calendar, Download, RefreshCw, ArrowUpRight, ArrowDownRight,
  AlertCircle, CreditCard, Clock, Warehouse
} from 'lucide-react';
import ReportChatbot from './Reports/ReportChatbot';
import DatePresets from '../components/DatePresets';

interface SaleItem {
  _id: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    category?: string;
  }>;
  total: number;
  createdAt: string;
}

interface DailySales {
  date: string;
  sales: number;
  orders: number;
  items: number;
}

interface ProductSales {
  name: string;
  quantity: number;
  revenue: number;
}

interface CategorySales {
  name: string;
  value: number;
}

interface SupplierSpend {
  name: string;
  spend: number;
  orders: number;
}

interface PurchaseVsSales {
  date: string;
  purchases: number;
  sales: number;
}

const toLocalDate = (d: Date) => d.toLocaleDateString('en-CA');

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Date range filter (default: last 7 days)
  const defaultTo = toLocalDate(new Date());
  const defaultFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return toLocalDate(d); })();
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  // keep timeRange for chatbot prop (derived label)
  const timeRange = 'week' as const;
  const [salesData, setSalesData] = useState<SaleItem[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  
  // Analytics data
  const [totalSales, setTotalSales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalItemsSold, setTotalItemsSold] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [dailySalesData, setDailySalesData] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [customerRetention, setCustomerRetention] = useState<any>(null);

  // Purchase & P&L state
  const [purchaseData, setPurchaseData] = useState<any[]>([]);
  const [totalPurchaseCost, setTotalPurchaseCost] = useState(0);
  const [cogs, setCogs] = useState(0);
  const [grossProfit, setGrossProfit] = useState(0);
  const [grossMargin, setGrossMargin] = useState(0);
  const [topSuppliers, setTopSuppliers] = useState<SupplierSpend[]>([]);
  const [purchaseVsSalesData, setPurchaseVsSalesData] = useState<PurchaseVsSales[]>([]);

  // Payment status state
  const [outstandingReceivables, setOutstandingReceivables] = useState(0);
  const [outstandingPayables, setOutstandingPayables] = useState(0);
  const [scheduledTotal, setScheduledTotal] = useState(0);

  // Previous period state (for % change)
  const [prevSales, setPrevSales] = useState(0);
  const [prevOrders, setPrevOrders] = useState(0);
  const [prevItemsSold, setPrevItemsSold] = useState(0);
  const [prevAvgOrder, setPrevAvgOrder] = useState(0);

  useEffect(() => {
    loadReportsData();
  }, [dateFrom, dateTo]);

  const loadReportsData = async () => {
    try {
      setLoading(true);

      const startDate = new Date(dateFrom + 'T00:00:00');
      const endDate = new Date(dateTo + 'T23:59:59');
      const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));

      // Previous period (same length, shifted back)
      const prevEndDate = new Date(startDate);
      prevEndDate.setMilliseconds(prevEndDate.getMilliseconds() - 1);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - days + 1);

      const params = new URLSearchParams();
      params.append('dateFrom', startDate.toISOString());
      params.append('dateTo', endDate.toISOString());

      const prevParams = new URLSearchParams();
      prevParams.append('dateFrom', prevStartDate.toISOString());
      prevParams.append('dateTo', prevEndDate.toISOString());

      const retentionParams = new URLSearchParams();
      retentionParams.append('timeRange', 'week');

      const [salesResponse, inventoryResponse, retentionResponse, purchasesResponse, prevSalesResponse] = await Promise.all([
        salesAPI.getAll(params.toString()),
        inventoryAPI.getAll(),
        customersAPI.getRetentionAnalytics(retentionParams.toString()),
        purchasesAPI.getAll(params.toString()),
        salesAPI.getAll(prevParams.toString()),
      ]);

      const sales = salesResponse.sales || [];
      const inventory = inventoryResponse || [];
      const retention = retentionResponse.data || null;
      const purchases = purchasesResponse.purchases || [];
      const prevSalesData = prevSalesResponse.sales || [];

      setSalesData(sales);
      setInventoryData(inventory);
      setCustomerRetention(retention);
      setPurchaseData(purchases);

      // Calculate previous period metrics for % change
      const prevRevenue = prevSalesData.reduce((s: number, sale: any) => s + sale.total, 0);
      const prevOrderCount = prevSalesData.length;
      const prevItems = prevSalesData.reduce((s: number, sale: any) =>
        s + sale.items.reduce((is: number, item: any) => is + item.quantity, 0), 0);
      setPrevSales(prevRevenue);
      setPrevOrders(prevOrderCount);
      setPrevItemsSold(prevItems);
      setPrevAvgOrder(prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0);

      // Calculate analytics
      calculateAnalytics(sales, inventory, purchases);

    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (sales: SaleItem[], inventory: any[], purchases: any[] = []) => {
    // Total sales revenue
    const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    setTotalSales(revenue);

    // Total orders
    setTotalOrders(sales.length);

    // Total items sold
    const itemsSold = sales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    setTotalItemsSold(itemsSold);

    // Average order value
    setAvgOrderValue(sales.length > 0 ? revenue / sales.length : 0);

    // COGS: inventory cost × quantity for each sale item
    const inventoryCostMap = new Map<string, number>();
    inventory.forEach(item => {
      if (item._id) inventoryCostMap.set(item._id.toString(), item.cost || 0);
      inventoryCostMap.set(item.name, item.cost || 0);
    });
    let totalCOGS = 0;
    sales.forEach(sale => {
      (sale.items as any[]).forEach(item => {
        const invId = item.inventoryId?._id?.toString() || item.inventoryId?.toString() || '';
        const cost = inventoryCostMap.get(invId) || inventoryCostMap.get(item.name) || 0;
        totalCOGS += cost * item.quantity;
      });
    });
    setCogs(totalCOGS);
    const profit = revenue - totalCOGS;
    setGrossProfit(profit);
    setGrossMargin(revenue > 0 ? (profit / revenue) * 100 : 0);

    // Total purchase cost
    const purchaseCost = purchases.reduce((s: number, p: any) => s + (p.total || 0), 0);
    setTotalPurchaseCost(purchaseCost);

    // Outstanding receivables (sales not fully paid)
    const receivables = sales.reduce((s: number, sale: any) => {
      if (sale.paymentStatus !== 'paid') return s + Math.max(0, (sale.total || 0) - (sale.paidAmount || 0));
      return s;
    }, 0);
    setOutstandingReceivables(receivables);

    // Outstanding payables (purchases not fully paid)
    const payables = purchases.reduce((s: number, p: any) => {
      if (p.paymentStatus !== 'paid') return s + Math.max(0, (p.total || 0) - (p.paidAmount || 0));
      return s;
    }, 0);
    setOutstandingPayables(payables);

    // Scheduled payments total
    const scheduled =
      [...sales, ...purchases]
        .filter((x: any) => (x.scheduledAmount || 0) > 0)
        .reduce((s: number, x: any) => s + (x.scheduledAmount || 0), 0);
    setScheduledTotal(scheduled);

    // Top suppliers by spend
    const supplierMap = new Map<string, { spend: number; orders: number }>();
    purchases.forEach((p: any) => {
      const existing = supplierMap.get(p.supplierName) || { spend: 0, orders: 0 };
      supplierMap.set(p.supplierName, { spend: existing.spend + (p.total || 0), orders: existing.orders + 1 });
    });
    const suppliersArr = Array.from(supplierMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);
    setTopSuppliers(suppliersArr);

    // Purchase vs Sales daily chart
    const pvsDailyMap = new Map<string, { purchases: number; sales: number }>();
    sales.forEach((sale: any) => {
      const date = new Date(sale.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = pvsDailyMap.get(date) || { purchases: 0, sales: 0 };
      pvsDailyMap.set(date, { ...existing, sales: existing.sales + sale.total });
    });
    purchases.forEach((p: any) => {
      const date = new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = pvsDailyMap.get(date) || { purchases: 0, sales: 0 };
      pvsDailyMap.set(date, { ...existing, purchases: existing.purchases + p.total });
    });
    const pvsData = Array.from(pvsDailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setPurchaseVsSalesData(pvsData);

    // Daily sales data for bar chart
    const dailyData = calculateDailySales(sales);
    setDailySalesData(dailyData);

    // Top products
    const productData = calculateTopProducts(sales);
    setTopProducts(productData);

    // Category sales for pie chart
    const categoryData = calculateCategorySales(sales, inventory);
    setCategorySales(categoryData);
  };

  const calculateDailySales = (sales: SaleItem[]): DailySales[] => {
    const dailyMap = new Map<string, { sales: number; orders: number; items: number }>();

    sales.forEach(sale => {
      const date = new Date(sale.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      const existing = dailyMap.get(date) || { sales: 0, orders: 0, items: 0 };
      const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
      
      dailyMap.set(date, {
        sales: existing.sales + sale.total,
        orders: existing.orders + 1,
        items: existing.items + itemCount
      });
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10); // Last 10 days
  };

  const calculateTopProducts = (sales: SaleItem[]): ProductSales[] => {
    const productMap = new Map<string, { quantity: number; revenue: number }>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.name) || { quantity: 0, revenue: 0 };
        productMap.set(item.name, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + (item.price * item.quantity)
        });
      });
    });

    return Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10); // Top 10 products
  };

  const calculateCategorySales = (sales: SaleItem[], inventory: any[]): CategorySales[] => {
    // Create a map of product names to categories from inventory
    const productCategoryMap = new Map<string, string>();
    inventory.forEach(item => {
      productCategoryMap.set(item.name, item.category);
      // Also map by _id for better matching
      if (item._id) {
        productCategoryMap.set(item._id.toString(), item.category);
      }
    });

    const categoryMap = new Map<string, number>();

    // Debug: Log first sale item to see structure
    if (sales.length > 0 && sales[0].items.length > 0) {
      console.log('Sample sale item structure:', JSON.stringify(sales[0].items[0], null, 2));
    }

    sales.forEach(sale => {
      sale.items.forEach((item: any) => {
        let category = 'Uncategorized';
        
        // Try multiple ways to get the category:
        // 1. From item.category directly
        if (item.category) {
          category = item.category;
        }
        // 2. From populated inventoryId object
        else if (item.inventoryId && typeof item.inventoryId === 'object' && item.inventoryId.category) {
          category = item.inventoryId.category;
        }
        // 3. From inventory map by inventoryId
        else if (item.inventoryId) {
          const invId = typeof item.inventoryId === 'string' ? item.inventoryId : item.inventoryId._id || item.inventoryId.toString();
          category = productCategoryMap.get(invId) || productCategoryMap.get(item.name) || 'Uncategorized';
        }
        // 4. From inventory map by product name
        else {
          category = productCategoryMap.get(item.name) || 'Uncategorized';
        }
        
        const existing = categoryMap.get(category) || 0;
        categoryMap.set(category, existing + (item.price * item.quantity));
      });
    });

    console.log('Category sales map:', Array.from(categoryMap.entries()));

    const result = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // If no sales data or all uncategorized, create sample data from inventory categories
    if ((result.length === 0 || (result.length === 1 && result[0].name === 'Uncategorized')) && inventory.length > 0) {
      console.log('Using inventory fallback data');
      const invCategoryMap = new Map<string, number>();
      inventory.forEach(item => {
        const existing = invCategoryMap.get(item.category) || 0;
        invCategoryMap.set(item.category, existing + (item.price * item.stock));
      });
      return Array.from(invCategoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }

    return result;
  };

  // Helper: percentage change vs previous period
  const pctChange = (current: number, prev: number): number => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Sales (Rs)', 'Orders', 'Items Sold'];
    const rows = dailySalesData.map(day => [
      day.date,
      day.sales.toFixed(2),
      day.orders.toString(),
      day.items.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Reports & Analytics</h1>
            <p className="text-gray-600">Comprehensive insights into your business performance</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadReportsData}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={e => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  max={toLocalDate(new Date())}
                  onChange={e => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <DatePresets onSelect={(from, to) => { setDateFrom(from); setDateTo(to); }} />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Sales */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Sales</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">₹{totalSales.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">Revenue generated</p>
            {prevSales > 0 && (() => {
              const chg = pctChange(totalSales, prevSales);
              return (
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${chg >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {chg >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(chg).toFixed(1)}% vs prev period
                </div>
              );
            })()}
          </div>

          {/* Total Orders */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Orders</span>
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
            <p className="text-sm text-gray-500 mt-1">Orders completed</p>
            {prevOrders > 0 && (() => {
              const chg = pctChange(totalOrders, prevOrders);
              return (
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${chg >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {chg >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(chg).toFixed(1)}% vs prev period
                </div>
              );
            })()}
          </div>

          {/* Items Sold */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Items Sold</span>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalItemsSold}</p>
            <p className="text-sm text-gray-500 mt-1">Total units sold</p>
            {prevItemsSold > 0 && (() => {
              const chg = pctChange(totalItemsSold, prevItemsSold);
              return (
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${chg >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {chg >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(chg).toFixed(1)}% vs prev period
                </div>
              );
            })()}
          </div>

          {/* Avg Order Value */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Avg Order Value</span>
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">₹{avgOrderValue.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">Per order average</p>
            {prevAvgOrder > 0 && (() => {
              const chg = pctChange(avgOrderValue, prevAvgOrder);
              return (
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${chg >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {chg >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(chg).toFixed(1)}% vs prev period
                </div>
              );
            })()}
          </div>
        </div>

        {/* Profit & Loss Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Profit & Loss Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-5 rounded-xl">
              <div className="text-sm font-medium text-teal-700 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-teal-900">₹{totalSales.toFixed(2)}</div>
              <div className="text-xs text-teal-600 mt-1">Sales income</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl">
              <div className="text-sm font-medium text-red-700 mb-1">Cost of Goods Sold</div>
              <div className="text-2xl font-bold text-red-900">₹{cogs.toFixed(2)}</div>
              <div className="text-xs text-red-600 mt-1">Based on inventory cost</div>
            </div>
            <div className={`bg-gradient-to-br p-5 rounded-xl ${grossProfit >= 0 ? 'from-green-50 to-green-100' : 'from-orange-50 to-orange-100'}`}>
              <div className={`text-sm font-medium mb-1 ${grossProfit >= 0 ? 'text-green-700' : 'text-orange-700'}`}>Gross Profit</div>
              <div className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-900' : 'text-orange-900'}`}>₹{grossProfit.toFixed(2)}</div>
              <div className={`text-xs mt-1 ${grossProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>Revenue − COGS</div>
            </div>
            <div className={`bg-gradient-to-br p-5 rounded-xl ${grossMargin >= 30 ? 'from-emerald-50 to-emerald-100' : grossMargin >= 10 ? 'from-yellow-50 to-yellow-100' : 'from-red-50 to-red-100'}`}>
              <div className={`text-sm font-medium mb-1 ${grossMargin >= 30 ? 'text-emerald-700' : grossMargin >= 10 ? 'text-yellow-700' : 'text-red-700'}`}>Gross Margin</div>
              <div className={`text-2xl font-bold ${grossMargin >= 30 ? 'text-emerald-900' : grossMargin >= 10 ? 'text-yellow-900' : 'text-red-900'}`}>{grossMargin.toFixed(1)}%</div>
              <div className={`text-xs mt-1 ${grossMargin >= 30 ? 'text-emerald-600' : grossMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                {grossMargin >= 30 ? 'Healthy margin' : grossMargin >= 10 ? 'Fair margin' : 'Low margin'}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Payment Status Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-l-4 border-red-400 bg-red-50 p-4 rounded-r-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-red-700">Outstanding Receivables</span>
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-900">₹{outstandingReceivables.toFixed(2)}</div>
              <div className="text-xs text-red-600 mt-1">Customers owe you this</div>
            </div>
            <div className="border-l-4 border-orange-400 bg-orange-50 p-4 rounded-r-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-orange-700">Outstanding Payables</span>
                <TrendingDown className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-orange-900">₹{outstandingPayables.toFixed(2)}</div>
              <div className="text-xs text-orange-600 mt-1">You owe suppliers this</div>
            </div>
            <div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-blue-700">Scheduled Payments</span>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-900">₹{scheduledTotal.toFixed(2)}</div>
              <div className="text-xs text-blue-600 mt-1">Pending scheduled amount</div>
            </div>
          </div>
        </div>

        {/* Customer Retention Metrics */}
        {customerRetention && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Retention Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-700 mb-1">Retention Rate</div>
                <div className="text-2xl font-bold text-blue-800">{customerRetention.overview.retentionRate}%</div>
                <div className="text-xs text-blue-600">Customer retention</div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-700 mb-1">Repeat Customers</div>
                <div className="text-2xl font-bold text-green-800">{customerRetention.overview.repeatCustomerRate}%</div>
                <div className="text-xs text-green-600">Repeat purchase rate</div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                <div className="text-sm font-medium text-purple-700 mb-1">Avg CLV</div>
                <div className="text-2xl font-bold text-purple-800">₹{customerRetention.overview.avgCustomerLifetimeValue}</div>
                <div className="text-xs text-purple-600">Customer lifetime value</div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
                <div className="text-sm font-medium text-orange-700 mb-1">Avg Days</div>
                <div className="text-2xl font-bold text-orange-800">{Math.round(customerRetention.overview.avgDaysBetweenPurchases)}</div>
                <div className="text-xs text-orange-600">Between purchases</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Segmentation */}
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-3">Customer Segmentation</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">High Value Customers</span>
                    <span className="text-sm font-medium text-gray-900">{customerRetention.segmentation.highValueCustomers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-gray-700">Recent Customers (30d)</span>
                    <span className="text-sm font-medium text-gray-900">{customerRetention.segmentation.recentCustomers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-gray-700">At Risk Customers</span>
                    <span className="text-sm font-medium text-gray-900">{customerRetention.segmentation.atRiskCustomers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-gray-700">One-time Buyers</span>
                    <span className="text-sm font-medium text-gray-900">{customerRetention.segmentation.oneTimeBuyers}</span>
                  </div>
                </div>
              </div>

              {/* Top Customers */}
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-3">Top Customers by Value</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {customerRetention.topCustomers.slice(0, 5).map((customer: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.totalPurchases} orders • Last: {customer.daysSinceLastPurchase}d ago</div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">₹{customer.totalSpent}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase & Expense Overview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-purple-600" />
            Purchase & Expense Overview
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary cards */}
            <div className="space-y-3">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-700 font-medium">Total Purchase Spend</div>
                <div className="text-2xl font-bold text-purple-900 mt-1">₹{totalPurchaseCost.toFixed(2)}</div>
                <div className="text-xs text-purple-500 mt-1">{purchaseData.length} purchase order{purchaseData.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="text-sm text-gray-600 font-medium">Net Cash Flow</div>
                <div className={`text-2xl font-bold mt-1 ${totalSales - totalPurchaseCost >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ₹{(totalSales - totalPurchaseCost).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Sales − Purchases</div>
              </div>
            </div>

            {/* Top Suppliers */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Top Suppliers by Spend</div>
              {topSuppliers.length > 0 ? (
                <div className="space-y-2">
                  {topSuppliers.map((supplier, i) => (
                    <div key={supplier.name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-800 truncate max-w-[120px]">{supplier.name}</span>
                          <span className="font-semibold text-gray-900">₹{supplier.spend.toFixed(0)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-purple-500 h-1.5 rounded-full"
                            {...{ style: { width: `${topSuppliers[0].spend > 0 ? (supplier.spend / topSuppliers[0].spend) * 100 : 0}%` } }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{supplier.orders} order{supplier.orders !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">No purchases in this period</div>
              )}
            </div>

            {/* Purchase vs Sales chart */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Purchase vs Sales</div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={purchaseVsSalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => `₹${Number(v).toFixed(2)}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="sales" fill="#0d9488" name="Sales" />
                  <Bar dataKey="purchases" fill="#8b5cf6" name="Purchases" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 1: Sales Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#0d9488" name="Sales (₹)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Charts Row 2: Orders & Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Orders</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="orders" stroke="#3b82f6" name="Orders" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Items Sold Per Day</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="items" fill="#8b5cf6" name="Items" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 3: Top Products & Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill="#10b981" name="Quantity Sold" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySales}
                  cx="40%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categorySales.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${typeof value === 'number' ? value.toFixed(2) : (parseFloat(value?.toString() || '0') || 0).toFixed(2)}`} />
                <Legend 
                  verticalAlign="middle" 
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  formatter={(value, entry: any) => {
                    const categoryData = categorySales.find(c => c.name === value);
                    return `${value} (₹${categoryData?.value.toFixed(2) || 0})`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity Sold</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topProducts.map((product, index) => (
                  <tr key={product.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                      {product.quantity} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                      ₹{product.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Report Chatbot */}
      <ReportChatbot
        salesData={salesData}
        inventoryData={inventoryData}
        totalSales={totalSales}
        totalOrders={totalOrders}
        totalItemsSold={totalItemsSold}
        avgOrderValue={avgOrderValue}
        categorySales={categorySales}
        topProducts={topProducts}
        timeRange={timeRange}
        customerRetention={customerRetention}
      />
    </Layout>
  );
};

export default Reports;
