import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Layout from '../layout/Layout'
import { 
  inventoryAPI, 
  salesAPI, 
  purchasesAPI, 
  invoicesAPI,
  customersAPI,
  suppliersAPI
} from '../services/api'
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Users, 
  AlertTriangle,
  FileText,
  ArrowRight,
  Truck
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DashboardStats {
  totalInventoryValue: number
  totalItems: number
  lowStockItems: number
  outOfStockItems: number
  totalSales: number
  totalPurchases: number
  totalTransactions: number
  pendingInvoices: number
  totalCustomers: number
  totalSuppliers: number
  recentSales: any[]
  recentPurchases: any[]
  topSellingItems: any[]
  stockItems: any[]
  monthlySalesData: any[]
  khaltiBalance: number
  khaltiIn: number
  khaltiOut: number
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalInventoryValue: 0,
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalSales: 0,
    totalPurchases: 0,
    totalTransactions: 0,
    pendingInvoices: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    recentSales: [],
    recentPurchases: [],
    topSellingItems: [],
    stockItems: [],
    monthlySalesData: [],
    khaltiBalance: 0,
    khaltiIn: 0,
    khaltiOut: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const [
        inventory,
        sales,
        purchases,
        invoices,
        customers,
        suppliers,
        khaltiBalanceData,
      ] = await Promise.all([
        inventoryAPI.getAll(),
        salesAPI.getAll('limit=1000&sortBy=date&sortOrder=desc'),
        purchasesAPI.getAll('limit=1000&sortBy=date&sortOrder=desc'),
        invoicesAPI.getAll('limit=100'),
        customersAPI.getAll(),
        suppliersAPI.getAll(),
        purchasesAPI.getKhaltiBalance().catch(() => ({ khaltiIn: 0, khaltiOut: 0, balance: 0 })),
      ])

      // Calculate inventory stats
      const totalInventoryValue = inventory.reduce((sum: number, item: any) => 
        sum + (item.price * item.stock), 0
      )
      const lowStockItems = inventory.filter((item: any) => 
        item.stock > 0 && item.stock < 20
      ).length
      const outOfStockItems = inventory.filter((item: any) => 
        item.stock === 0
      ).length

      // Prepare stock items for Stock Summary
      const stockItemsData = inventory
        .map((item: any) => ({
          id: item._id,
          name: item.name,
          quantity: item.stock,
          threshold: item.reorderPoint || 10,
          status: item.stock === 0 ? 'critical' : item.stock < 20 ? 'low' : 'good'
        }))
        .filter((item: any) => item.status !== 'good')
        .slice(0, 10)

      // Calculate sales total
      const salesData = sales.sales || sales
      const totalSalesAmount = salesData.reduce((sum: number, sale: any) => 
        sum + (sale.total || 0), 0
      )

      // Calculate monthly sales data for chart
      const monthlySales = calculateMonthlySales(salesData)

      // Calculate purchases total — only sum paidAmount so installment purchases
      // only reduce the balance when an actual payment is made, not at time of order
      const purchasesData = purchases.purchases || purchases
      const totalPurchasesAmount = purchasesData.reduce((sum: number, purchase: any) => 
        sum + (purchase.paidAmount || 0), 0
      )
      const totalTransactions = salesData.length + purchasesData.length

      // Calculate pending invoices
      const invoicesData = invoices.invoices || invoices
      const pendingInvoicesCount = invoicesData.filter((invoice: any) => 
        invoice.paymentStatus === 'pending' || invoice.paymentStatus === 'partial'
      ).length

      // Build a map of relatedId (sale/purchase _id) -> invoice _id for quick lookup
      const invoiceMap: Record<string, string> = {}
      invoicesData.forEach((inv: any) => {
        if (inv.relatedId) {
          const key = typeof inv.relatedId === 'object' ? inv.relatedId._id || String(inv.relatedId) : String(inv.relatedId)
          invoiceMap[key] = inv._id
        }
      })

      setStats({
        totalInventoryValue,
        totalItems: inventory.length,
        lowStockItems,
        outOfStockItems,
        totalSales: totalSalesAmount,
        totalPurchases: totalPurchasesAmount,
        totalTransactions,
        pendingInvoices: pendingInvoicesCount,
        totalCustomers: customers.pagination?.total ?? customers.data?.length ?? 0,
        totalSuppliers: suppliers.pagination?.total ?? suppliers.data?.length ?? 0,
        recentSales: salesData.slice(0, 5).map((s: any) => ({ ...s, invoiceId: invoiceMap[String(s._id)] || null })),
        recentPurchases: purchasesData.slice(0, 5).map((p: any) => ({ ...p, invoiceId: invoiceMap[String(p._id)] || null })),
        topSellingItems: inventory.sort((a: any, b: any) => 
          (b.stock || 0) - (a.stock || 0)
        ).slice(0, 5),
        stockItems: stockItemsData,
        monthlySalesData: monthlySales,
        khaltiBalance: khaltiBalanceData.balance,
        khaltiIn: khaltiBalanceData.khaltiIn,
        khaltiOut: khaltiBalanceData.khaltiOut,
      })
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard data', {
        description: error?.message || 'Please try again later.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate monthly sales for the last 7 months
  const calculateMonthlySales = (salesData: any[]) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlySalesMap: { [key: string]: number } = {}
    
    // Get last 7 months
    const currentDate = new Date()
    const months: Array<{ key: string; name: string }> = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`
      const monthName = monthNames[date.getMonth()]
      months.push({ key: monthKey, name: monthName })
      monthlySalesMap[monthKey] = 0
    }

    // Aggregate sales by month
    salesData.forEach((sale: any) => {
      try {
        // Use createdAt if date is not available
        const saleDate = new Date(sale.date || sale.createdAt)
        if (!isNaN(saleDate.getTime())) {
          const monthKey = `${saleDate.getFullYear()}-${saleDate.getMonth()}`
          if (monthlySalesMap.hasOwnProperty(monthKey)) {
            monthlySalesMap[monthKey] += sale.total || 0
          }
        }
      } catch (error) {
        console.error('Error processing sale date:', error)
      }
    })

    // Format for chart
    const chartData = months.map(month => ({
      name: month.name,
      sales: Math.round(monthlySalesMap[month.key])
    }))
    
    console.log('Monthly Sales Data for Chart:', chartData)
    return chartData
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    onClick,
    subtitle 
  }: { 
    title: string
    value: string | number
    icon: any
    color: string
    onClick?: () => void
    subtitle?: string
  }) => (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm p-6 ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {onClick && (
        <div className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-700">
          View Details <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Dashboard</h2>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your business today.</p>
        </div>

        {/* Alert Section */}
        {(stats.lowStockItems > 0 || stats.outOfStockItems > 0) && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-orange-500 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  Inventory Alert: {stats.outOfStockItems} out of stock, {stats.lowStockItems} low stock items
                </p>
              </div>
              <button
                onClick={() => navigate('/low-stock')}
                className="text-sm text-orange-700 hover:text-orange-800 font-medium"
              >
                View Details →
              </button>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Inventory Value"
            value={`Rs ${stats.totalInventoryValue.toLocaleString()}`}
            icon={Package}
            color="bg-blue-500"
            onClick={() => navigate('/inventory')}
            subtitle={`${stats.totalItems} items in stock`}
          />
          <StatCard
            title="Total Sales"
            value={`Rs ${stats.totalSales.toLocaleString()}`}
            icon={TrendingUp}
            color="bg-green-500"
            onClick={() => navigate('/sales')}
            subtitle="All time revenue"
          />
          <StatCard
            title="Total Purchases Paid"
            value={`Rs ${stats.totalPurchases.toLocaleString()}`}
            icon={ShoppingCart}
            color="bg-purple-500"
            onClick={() => navigate('/purchases')}
            subtitle="Actual cash paid out"
          />
          <StatCard
            title="Pending Invoices"
            value={stats.pendingInvoices}
            icon={FileText}
            color="bg-orange-500"
            onClick={() => navigate('/invoices')}
            subtitle="Requires attention"
          />
          <StatCard
            title="Total Transactions"
            value={stats.totalTransactions}
            icon={DollarSign}
            color="bg-teal-500"
            onClick={() => navigate('/transactions')}
            subtitle="Sales + purchases records"
          />
        </div>

        {/* Khalti Wallet Balance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">K</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Khalti Wallet Balance</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Collected (Sales)</p>
              <p className="text-xl font-bold text-green-600">Rs {stats.khaltiIn.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Paid Out (Purchases)</p>
              <p className="text-xl font-bold text-red-600">Rs {stats.khaltiOut.toLocaleString()}</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${stats.khaltiBalance >= 0 ? 'bg-teal-50' : 'bg-orange-50'}`}>
              <p className="text-xs text-gray-500 mb-1">Net Balance</p>
              <p className={`text-xl font-bold ${stats.khaltiBalance >= 0 ? 'text-teal-600' : 'text-orange-600'}`}>
                Rs {stats.khaltiBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Items in Inventory"
            value={stats.totalItems}
            icon={Package}
            color="bg-blue-500"
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            title="Out of Stock"
            value={stats.outOfStockItems}
            icon={AlertTriangle}
            color="bg-red-500"
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            color="bg-teal-500"
            onClick={() => navigate('/customers')}
          />
          <StatCard
            title="Total Suppliers"
            value={stats.totalSuppliers}
            icon={Truck}
            color="bg-indigo-500"
            onClick={() => navigate('/suppliers')}
          />
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Recent Sales</h3>
              <button
                onClick={() => navigate('/sales')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {stats.recentSales.length > 0 ? (
                stats.recentSales.map((sale: any, index: number) => (
                  <div
                    key={sale._id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => sale.invoiceId ? navigate(`/invoices/${sale.invoiceId}`) : navigate('/sales')}
                    title={sale.invoiceId ? 'View Invoice' : 'View Sales'}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {sale.customerName || sale.customer?.name || 'Walk-in Customer'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(sale.date || sale.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        Rs {sale.total?.toLocaleString() || 0}
                      </p>
                      <p className={`text-xs ${
                        sale.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {sale.paymentStatus || 'pending'}
                      </p>
                      {sale.invoiceId && (
                        <p className="text-xs text-blue-500 mt-0.5 flex items-center justify-end gap-1">
                          <FileText className="w-3 h-3" /> View Invoice
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent sales</p>
              )}
            </div>
          </div>

          {/* Recent Purchases */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Recent Purchases</h3>
              <button
                onClick={() => navigate('/purchases')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {stats.recentPurchases.length > 0 ? (
                stats.recentPurchases.map((purchase: any, index: number) => (
                  <div
                    key={purchase._id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => purchase.invoiceId ? navigate(`/invoices/${purchase.invoiceId}`) : navigate('/purchases')}
                    title={purchase.invoiceId ? 'View Invoice' : 'View Purchases'}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {purchase.supplierName || purchase.supplier?.name || 'Unknown Supplier'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(purchase.date || purchase.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        Rs {purchase.total?.toLocaleString() || 0}
                      </p>
                      <p className={`text-xs ${
                        purchase.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {purchase.paymentStatus || 'pending'}
                      </p>
                      {purchase.invoiceId && (
                        <p className="text-xs text-blue-500 mt-0.5 flex items-center justify-end gap-1">
                          <FileText className="w-3 h-3" /> View Invoice
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent purchases</p>
              )}
            </div>
          </div>
        </div>

        {/* Stock Summary and Sales Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Summary */}
          <div className="bg-white rounded-lg shadow-sm p-5 h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Stock Summary</h2>
              <span className="text-sm text-gray-500">
                Total Items: {stats.totalItems}
              </span>
            </div>
            {stats.stockItems.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-4 rounded">
                <div className="flex items-center">
                  <AlertTriangle className="text-amber-500 mr-2" size={18} />
                  <p className="text-sm text-amber-700">
                    {stats.stockItems.length} {stats.stockItems.length === 1 ? 'item' : 'items'} below
                    recommended stock level
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {stats.stockItems.length > 0 ? (
                stats.stockItems.map((item: any) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                      item.status === 'critical' 
                        ? 'border-red-200 bg-red-50' 
                        : item.status === 'low' 
                        ? 'border-amber-200 bg-amber-50' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => navigate('/inventory?highlight=' + item.id)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <span
                        className={`text-sm font-bold ${
                          item.quantity === 0 
                            ? 'text-red-600' 
                            : item.quantity < 5 
                            ? 'text-red-600' 
                            : item.status === 'low' 
                            ? 'text-amber-600' 
                            : 'text-green-600'
                        }`}
                      >
                        {item.quantity}
                        {item.quantity < 5 && (
                          <AlertTriangle size={14} className="inline ml-1" />
                        )}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Threshold: {item.threshold}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          item.quantity === 0
                            ? 'text-red-600'
                            : item.quantity < 5
                            ? 'text-red-600'
                            : item.status === 'low'
                            ? 'text-amber-600'
                            : 'text-green-600'
                        }`}
                      >
                        {item.quantity === 0
                          ? 'Out of Stock'
                          : item.quantity < 5
                          ? 'Critical'
                          : item.status === 'low'
                          ? 'Low Stock'
                          : 'In Stock'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  All items are well stocked! 🎉
                </p>
              )}
            </div>
            <button 
              onClick={() => navigate('/inventory')}
              className="w-full mt-4 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 text-sm font-medium"
            >
              View All Inventory
            </button>
          </div>

          {/* Sales Trend */}
          <div className="bg-white rounded-lg shadow-sm p-5 h-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Sales Trend</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Last 7 months performance
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  Rs {stats.totalSales.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  {stats.monthlySalesData.length > 0 && stats.monthlySalesData.some((m: any) => m.sales > 0) ? (
                    <>Avg: Rs {Math.round(stats.totalSales / 7).toLocaleString()}/month</>
                  ) : (
                    <>No sales yet</>
                  )}
                </div>
              </div>
            </div>
            <div className="h-64">
              {stats.monthlySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stats.monthlySalesData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fontSize: 12,
                        fill: '#6b7280'
                      }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 12,
                        fill: '#6b7280'
                      }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value > 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                    />
                    <Tooltip
                      formatter={(value: any) => [`Rs ${Number(value).toLocaleString()}`, 'Sales']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        backgroundColor: '#ffffff'
                      }}
                      labelStyle={{ color: '#374151', fontWeight: 600 }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px' }}
                      iconType="line"
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      name="Sales"
                      stroke="#14b8a6"
                      strokeWidth={3}
                      dot={{
                        r: 5,
                        fill: '#14b8a6',
                        strokeWidth: 2,
                        stroke: '#ffffff'
                      }}
                      activeDot={{
                        r: 7,
                        fill: '#0d9488',
                        strokeWidth: 2,
                        stroke: '#ffffff'
                      }}
                      animationDuration={1000}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg className="w-16 h-16 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>No sales data available</p>
                  <p className="text-xs mt-1">Start making sales to see trends</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/billing')}
              className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <DollarSign className="w-8 h-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">New Sale</span>
            </button>
            <button
              onClick={() => navigate('/purchases')}
              className="flex flex-col items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-8 h-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">New Purchase</span>
            </button>
            <button
              onClick={() => navigate('/inventory')}
              className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <Package className="w-8 h-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Add Inventory</span>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="flex flex-col items-center justify-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <FileText className="w-8 h-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">View Reports</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard
