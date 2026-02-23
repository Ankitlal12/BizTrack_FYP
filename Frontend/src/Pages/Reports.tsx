import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Layout from '../layout/Layout';
import { salesAPI, inventoryAPI } from '../services/api';
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Package, ShoppingCart, DollarSign, 
  Calendar, Download, RefreshCw 
} from 'lucide-react';
import ReportChatbot from './Reports/ReportChatbot';

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

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
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

  useEffect(() => {
    loadReportsData();
  }, [timeRange]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setDate(startDate.getDate() - 30);
      }

      // Fetch sales data and inventory data
      const params = new URLSearchParams();
      params.append('dateFrom', startDate.toISOString());
      params.append('dateTo', endDate.toISOString());
      
      const [salesResponse, inventoryResponse] = await Promise.all([
        salesAPI.getAll(params.toString()),
        inventoryAPI.getAll()
      ]);
      
      const sales = salesResponse.sales || [];
      const inventory = inventoryResponse || [];
      
      setSalesData(sales);
      setInventoryData(inventory);

      // Calculate analytics
      calculateAnalytics(sales, inventory);
      
    } catch (error: any) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (sales: SaleItem[], inventory: any[]) => {
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

        {/* Time Range Selector */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Time Range:</span>
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range === 'day' ? 'Today' : range === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Sales</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">₹{totalSales.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">Revenue generated</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Orders</span>
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
            <p className="text-sm text-gray-500 mt-1">Orders completed</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Items Sold</span>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalItemsSold}</p>
            <p className="text-sm text-gray-500 mt-1">Total units sold</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Avg Order Value</span>
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">₹{avgOrderValue.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">Per order average</p>
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
      />
    </Layout>
  );
};

export default Reports;
