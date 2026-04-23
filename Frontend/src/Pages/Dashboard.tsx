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
  Truck,
  RefreshCw
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
        purchasesAPI.getKhaltiBalance({ scope: 'tenant' }).catch(() => ({ khaltiIn: 0, khaltiOut: 0, balance: 0 })),
      ])

      // Calculate inventory stats (cost basis to match Inventory page summary)
      const totalInventoryValue = inventory.reduce((sum: number, item: any) => 
        sum + ((Number(item.cost) || 0) * (Number(item.stock) || 0)), 0
      )
      const lowStockItems = inventory.filter((item: any) => 
        item.stock > 0 && item.stock < 20
      ).length
      const outOfStockItems = inventory.filter((item: any) => 
        item.stock === 0
      ).length

      // Prepare stock items for Stock Summary (highest stock first)
      const stockItemsData = inventory
        .map((item: any) => ({
          id: item._id,
          name: item.name,
          quantity: item.stock,
          threshold: item.reorderPoint || item.reorderLevel || 10,
          stockValue: (Number(item.cost) || 0) * (Number(item.stock) || 0),
          status: item.stock >= 100 ? 'high' : item.stock >= 30 ? 'good' : 'medium'
        }))
        .filter((item: any) => (item.quantity || 0) > 0)
        .sort((a: any, b: any) => (b.quantity || 0) - (a.quantity || 0))
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
    
    return chartData
  }

  const getStockBarWidthClass = (quantity: number, maxQuantity: number) => {
    const ratio = maxQuantity > 0 ? quantity / maxQuantity : 0
    if (ratio >= 0.9) return 'w-full'
    if (ratio >= 0.75) return 'w-4/5'
    if (ratio >= 0.6) return 'w-3/5'
    if (ratio >= 0.45) return 'w-1/2'
    if (ratio >= 0.3) return 'w-2/5'
    return 'w-1/4'
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    onClick,
    subtitle 
  }: { 
    title: string
    value: string | number
    icon: any
    onClick?: () => void
    subtitle?: string
  }) => (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${
        onClick ? 'cursor-pointer transition-colors hover:border-gray-300 hover:bg-gray-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
      </div>
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
      <div className="space-y-5 sm:space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Business Dashboard</h2>
            <p className="mt-1 text-sm text-gray-600">A clean snapshot of operations, cash flow, and activity.</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="mt-3 inline-flex items-center gap-2 self-start rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:mt-0"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {(stats.lowStockItems > 0 || stats.outOfStockItems > 0) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  Inventory Alert: {stats.outOfStockItems} out of stock, {stats.lowStockItems} low stock items
                </p>
              </div>
              <button
                onClick={() => navigate('/low-stock')}
                className="text-sm font-medium text-amber-700 hover:text-amber-900"
              >
                View Details →
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Total Inventory Value"
            value={`Rs ${stats.totalInventoryValue.toLocaleString()}`}
            icon={Package}
            onClick={() => navigate('/inventory')}
            subtitle={`${stats.totalItems} items in stock (cost basis)`}
          />
          <StatCard
            title="Total Sales"
            value={`Rs ${stats.totalSales.toLocaleString()}`}
            icon={TrendingUp}
            onClick={() => navigate('/sales')}
            subtitle="All time revenue"
          />
          <StatCard
            title="Total Purchases Paid"
            value={`Rs ${stats.totalPurchases.toLocaleString()}`}
            icon={ShoppingCart}
            onClick={() => navigate('/purchases')}
            subtitle="Actual cash paid out"
          />
          <StatCard
            title="Pending Invoices"
            value={stats.pendingInvoices}
            icon={FileText}
            onClick={() => navigate('/invoices')}
            subtitle="Requires attention"
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            onClick={() => navigate('/customers')}
            subtitle="Active customer records"
          />
          <StatCard
            title="Total Suppliers"
            value={stats.totalSuppliers}
            icon={Truck}
            onClick={() => navigate('/suppliers')}
            subtitle="Vendor records"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 xl:col-span-2">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Sales Trend</h3>
                <p className="text-xs text-gray-500">Last 7 months performance</p>
              </div>
              <p className="text-sm font-medium text-gray-700">Total: Rs {stats.totalSales.toLocaleString()}</p>
            </div>
            <div className="h-72">
              {stats.monthlySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stats.monthlySalesData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value > 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                    />
                    <Tooltip
                      formatter={(value: any) => [`Rs ${Number(value).toLocaleString()}`, 'Sales']}
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.07)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      name="Sales"
                      stroke="#0f766e"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#0f766e', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#115e59' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
                  No sales data available yet
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-base font-semibold text-gray-900">Cash Snapshot</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                <span className="text-gray-600">Khalti In</span>
                <span className="font-semibold text-gray-900">Rs {stats.khaltiIn.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                <span className="text-gray-600">Khalti Out</span>
                <span className="font-semibold text-gray-900">Rs {stats.khaltiOut.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                <span className="text-gray-600">Net Khalti Balance</span>
                <span className="font-semibold text-gray-900">Rs {stats.khaltiBalance.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                <span className="text-gray-600">Transactions</span>
                <span className="font-semibold text-gray-900">{stats.totalTransactions}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Recent Sales</h3>
              <button
                onClick={() => navigate('/sales')}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {stats.recentSales.length > 0 ? (
                stats.recentSales.map((sale: any, index: number) => (
                  <div
                    key={sale._id || index}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
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
                        sale.paymentStatus === 'paid' ? 'text-teal-700' : 'text-amber-700'
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

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Recent Purchases</h3>
              <button
                onClick={() => navigate('/purchases')}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {stats.recentPurchases.length > 0 ? (
                stats.recentPurchases.map((purchase: any, index: number) => (
                  <div
                    key={purchase._id || index}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
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
                        purchase.paymentStatus === 'paid' ? 'text-teal-700' : 'text-amber-700'
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

        <div className="grid grid-cols-1 gap-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Top Stocked Items</h2>
              <span className="text-sm text-gray-500">
                Highest quantity in inventory
              </span>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {stats.stockItems.length > 0 ? (
                stats.stockItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="cursor-pointer rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                    onClick={() => navigate('/inventory?highlight=' + item.id)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <span className="rounded-md bg-teal-50 px-2.5 py-1 text-sm font-semibold text-teal-700">
                        {item.quantity} pcs
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Threshold: {item.threshold}
                      </span>
                      <span className="text-xs font-medium text-gray-600">
                        Stock Value: Rs {Number(item.stockValue || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No stock items available
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View All Inventory
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
          <p className="mt-1 text-xs text-gray-500">Placed at the bottom for fast access after reviewing dashboard insights.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <button
              onClick={() => navigate('/billing')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              New Sale
            </button>
            <button
              onClick={() => navigate('/purchases')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              New Purchase
            </button>
            <button
              onClick={() => navigate('/inventory')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Manage Inventory
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              View Reports
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard
