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
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  dailyOverviewData: any[]
  weeklyOverviewData: any[]
  monthlyOverviewData: any[]
  topCustomersData: any[]
  categoryBreakerdownData: any[]
  stockGraphData: any[]
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
    dailyOverviewData: [],
    weeklyOverviewData: [],
    monthlyOverviewData: [],
    topCustomersData: [],
    categoryBreakerdownData: [],
    stockGraphData: [],
    khaltiBalance: 0,
    khaltiIn: 0,
    khaltiOut: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<'days' | 'weeks' | 'months'>('months')
  const [salesData, setSalesData] = useState<any[]>([])

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
      setSalesData(salesData)
      const totalSalesAmount = salesData.reduce((sum: number, sale: any) => 
        sum + (sale.total || 0), 0
      )

      // Calculate purchases total — only sum paidAmount so installment purchases
      // only reduce the balance when an actual payment is made, not at time of order
      const purchasesData = purchases.purchases || purchases
      const totalPurchasesAmount = purchasesData.reduce((sum: number, purchase: any) => 
        sum + (purchase.paidAmount || 0), 0
      )
      // Build daily, weekly, monthly overview data for graph widgets
      const dailySales = calculateDailyTotals(salesData, 'total')
      const dailyPurchases = calculateDailyTotals(purchasesData, 'paidAmount')
      const dailyOverviewData = dailySales.map((day: any, index: number) => {
        const purchasesValue = dailyPurchases[index]?.value || 0
        const salesValue = day.value || 0
        return {
          name: day.name,
          sales: Math.round(salesValue),
          purchases: Math.round(purchasesValue),
          net: Math.round(salesValue - purchasesValue),
        }
      })

      const weeklySales = calculateWeeklyTotals(salesData, 'total')
      const weeklyPurchases = calculateWeeklyTotals(purchasesData, 'paidAmount')
      const weeklyOverviewData = weeklySales.map((week: any, index: number) => {
        const purchasesValue = weeklyPurchases[index]?.value || 0
        const salesValue = week.value || 0
        return {
          name: week.name,
          sales: Math.round(salesValue),
          purchases: Math.round(purchasesValue),
          net: Math.round(salesValue - purchasesValue),
        }
      })

      const monthlySales = calculateMonthlyTotals(salesData, 'total')
      const monthlyPurchases = calculateMonthlyTotals(purchasesData, 'paidAmount')
      const monthlyOverviewData = monthlySales.map((month: any, index: number) => {
        const purchasesValue = monthlyPurchases[index]?.value || 0
        const salesValue = month.value || 0
        return {
          name: month.name,
          sales: Math.round(salesValue),
          purchases: Math.round(purchasesValue),
          net: Math.round(salesValue - purchasesValue),
        }
      })

      // Top customers by total spent
      const customerMap: Record<string, number> = {}
      salesData.forEach((sale: any) => {
        const customerName = sale.customerName || sale.customer?.name || 'Walk-in'
        customerMap[customerName] = (customerMap[customerName] || 0) + (sale.total || 0)
      })
      const topCustomersData = Object.entries(customerMap)
        .map(([name, total]) => ({ name: name.length > 16 ? `${name.slice(0, 16)}...` : name, amount: Math.round(total as number) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6)

      // Sales by category - using same logic as Reports page
      const productCategoryMap = new Map<string, string>()
      inventory.forEach((item: any) => {
        productCategoryMap.set(item.name, item.category)
        if (item._id) {
          productCategoryMap.set(item._id.toString(), item.category)
        }
      })

      const categoryMap = new Map<string, number>()
      salesData.forEach((sale: any) => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            let category = 'Uncategorized'
            
            // Try multiple ways to get the category (same as Reports page):
            // 1. From item.category directly
            if (item.category) {
              category = item.category
            }
            // 2. From populated inventoryId object
            else if (item.inventoryId && typeof item.inventoryId === 'object' && item.inventoryId.category) {
              category = item.inventoryId.category
            }
            // 3. From inventory map by inventoryId
            else if (item.inventoryId) {
              const invId = typeof item.inventoryId === 'string' ? item.inventoryId : item.inventoryId._id || item.inventoryId.toString()
              category = productCategoryMap.get(invId) || productCategoryMap.get(item.name) || 'Uncategorized'
            }
            // 4. From inventory map by product name
            else {
              category = productCategoryMap.get(item.name) || 'Uncategorized'
            }
            
            const existing = categoryMap.get(category) || 0
            categoryMap.set(category, existing + ((item.price || 0) * (item.quantity || 0)))
          })
        }
      })

      const categoryBreakerdownData = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)

      const stockGraphData = stockItemsData.slice(0, 6).map((item: any) => ({
        name: item.name.length > 14 ? `${item.name.slice(0, 14)}...` : item.name,
        quantity: item.quantity,
        stockValue: Math.round(item.stockValue),
      }))

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
        dailyOverviewData,
        weeklyOverviewData,
        monthlyOverviewData,
        topCustomersData,
        categoryBreakerdownData,
        stockGraphData,
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

  const calculateDailyTotals = (records: any[], amountField: string) => {
    const dailyMap: { [key: string]: number } = {}
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    // Get last 14 days
    const currentDate = new Date()
    const days: Array<{ key: string; name: string }> = []
    for (let i = 13; i >= 0; i--) {
      const date = new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      const dayName = dayNames[date.getDay()]
      const monthDay = date.getDate()
      days.push({ key: dateKey, name: `${dayName} ${monthDay}` })
      dailyMap[dateKey] = 0
    }

    records.forEach((record: any) => {
      try {
        const recordDate = new Date(record.date || record.createdAt)
        const dateKey = recordDate.toISOString().split('T')[0]
        if (dailyMap.hasOwnProperty(dateKey)) {
          dailyMap[dateKey] += Number(record[amountField]) || 0
        }
      } catch (error) {
        console.error('Error processing record date:', error)
      }
    })

    return days.map(day => ({
      name: day.name,
      value: Math.round(dailyMap[day.key])
    }))
  }

  const calculateWeeklyTotals = (records: any[], amountField: string) => {
    const weeklyMap: { [key: string]: number } = {}
    
    // Get last 12 weeks
    const currentDate = new Date()
    const weeks: Array<{ key: string; name: string }> = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      const weekKey = `${weekStart.toISOString().split('T')[0]}`
      const weekName = `W${Math.floor((date.getDate() - date.getDay() + 6) / 7)}`
      weeks.push({ key: weekKey, name: weekName })
      weeklyMap[weekKey] = 0
    }

    records.forEach((record: any) => {
      try {
        const recordDate = new Date(record.date || record.createdAt)
        const weekStart = new Date(recordDate)
        weekStart.setDate(recordDate.getDate() - recordDate.getDay())
        const weekKey = weekStart.toISOString().split('T')[0]
        
        for (const week of weeks) {
          const weekDateStart = new Date(week.key)
          const weekDateEnd = new Date(weekDateStart)
          weekDateEnd.setDate(weekDateStart.getDate() + 7)
          
          if (recordDate >= weekDateStart && recordDate < weekDateEnd) {
            weeklyMap[week.key] += Number(record[amountField]) || 0
            break
          }
        }
      } catch (error) {
        console.error('Error processing record date:', error)
      }
    })

    return weeks.map(week => ({
      name: week.name,
      value: Math.round(weeklyMap[week.key])
    }))
  }

  const calculateMonthlyTotals = (records: any[], amountField: string) => {
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

    // Aggregate records by month
    records.forEach((record: any) => {
      try {
        const recordDate = new Date(record.date || record.createdAt)
        if (!isNaN(recordDate.getTime())) {
          const monthKey = `${recordDate.getFullYear()}-${recordDate.getMonth()}`
          if (monthlySalesMap.hasOwnProperty(monthKey)) {
            monthlySalesMap[monthKey] += Number(record[amountField]) || 0
          }
        }
      } catch (error) {
        console.error('Error processing record date:', error)
      }
    })

    // Format for chart
    const chartData = months.map(month => ({
      name: month.name,
      value: Math.round(monthlySalesMap[month.key])
    }))
    
    return chartData
  }

  const getOverviewData = () => {
    switch (timeFilter) {
      case 'days':
        return stats.dailyOverviewData
      case 'weeks':
        return stats.weeklyOverviewData
      default:
        return stats.monthlyOverviewData
    }
  }

  const getDateRangeForFilter = () => {
    const currentDate = new Date()
    let startDate: Date
    
    switch (timeFilter) {
      case 'days':
        // Last 14 days
        startDate = new Date(currentDate.getTime() - 13 * 24 * 60 * 60 * 1000)
        break
      case 'weeks':
        // Last 12 weeks
        startDate = new Date(currentDate.getTime() - 11 * 7 * 24 * 60 * 60 * 1000)
        break
      case 'months':
      default:
        // Last 7 months
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1)
        break
    }
    
    return { startDate, endDate: currentDate }
  }

  const getFilteredSalesData = () => {
    const { startDate, endDate } = getDateRangeForFilter()
    
    return salesData.filter((sale: any) => {
      const saleDate = new Date(sale.date || sale.createdAt)
      return saleDate >= startDate && saleDate <= endDate
    })
  }

  const getTopCustomersForPeriod = () => {
    const filteredSales = getFilteredSalesData()
    const customerMap: Record<string, number> = {}
    
    filteredSales.forEach((sale: any) => {
      const customerName = sale.customerName || sale.customer?.name || 'Walk-in'
      customerMap[customerName] = (customerMap[customerName] || 0) + (sale.total || 0)
    })
    
    return Object.entries(customerMap)
      .map(([name, total]) => ({ 
        name: name.length > 16 ? `${name.slice(0, 16)}...` : name, 
        amount: Math.round(total as number) 
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
  }

  const getCategorySalesForPeriod = () => {
    const filteredSales = getFilteredSalesData()
    
    const productCategoryMap = new Map<string, string>()
    
    const categoryMap = new Map<string, number>()
    filteredSales.forEach((sale: any) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          let category = 'Uncategorized'
          
          // Try multiple ways to get the category (same as Reports page)
          if (item.category) {
            category = item.category
          } else if (item.inventoryId && typeof item.inventoryId === 'object' && item.inventoryId.category) {
            category = item.inventoryId.category
          } else if (item.inventoryId) {
            const invId = typeof item.inventoryId === 'string' ? item.inventoryId : item.inventoryId._id || item.inventoryId.toString()
            category = productCategoryMap.get(invId) || productCategoryMap.get(item.name) || 'Uncategorized'
          } else {
            category = productCategoryMap.get(item.name) || 'Uncategorized'
          }
          
          const existing = categoryMap.get(category) || 0
          categoryMap.set(category, existing + ((item.price || 0) * (item.quantity || 0)))
        })
      }
    })

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
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
      className={`group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 transform-gpu ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:scale-[1.02] hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100/60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-medium text-slate-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className="rounded-xl bg-teal-50 p-3 transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-4 w-4 text-teal-700" />
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
      <div className="space-y-6 p-1 sm:p-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 sm:flex sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                Overview
              </div>
              <h2 className="mt-3 text-3xl font-medium tracking-tight text-slate-900">Business Dashboard</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                A clean snapshot of sales, inventory, cash flow, and tasks that need attention.
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              className="mt-4 inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-teal-200 hover:text-teal-700 sm:mt-0"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {(stats.lowStockItems > 0 || stats.outOfStockItems > 0) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-white p-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    Inventory Alert: {stats.outOfStockItems} out of stock, {stats.lowStockItems} low stock items
                  </p>
                  <p className="text-xs text-amber-700">A quick refill will protect sales continuity.</p>
                </div>
                <button
                  onClick={() => navigate('/low-stock')}
                  className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50"
                >
                  View Details →
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <StatCard
                  title="Total Sales"
                  value={`Rs ${stats.totalSales.toLocaleString()}`}
                  icon={TrendingUp}
                  onClick={() => navigate('/sales')}
                  subtitle="All-time revenue"
                />
                <StatCard
                  title="Purchases Paid"
                  value={`Rs ${stats.totalPurchases.toLocaleString()}`}
                  icon={ShoppingCart}
                  onClick={() => navigate('/purchases')}
                  subtitle="Actual cash out"
                />
                <StatCard
                  title="Inventory Value"
                  value={`Rs ${stats.totalInventoryValue.toLocaleString()}`}
                  icon={Package}
                  onClick={() => navigate('/inventory')}
                  subtitle={`${stats.totalItems} items in stock`}
                />
                <StatCard
                  title="Pending Invoices"
                  value={stats.pendingInvoices}
                  icon={FileText}
                  onClick={() => navigate('/invoices')}
                  subtitle="Needs attention"
                />
                <StatCard
                  title="Customer Records"
                  value={stats.totalCustomers}
                  icon={Users}
                  onClick={() => navigate('/customers')}
                  subtitle={`${stats.totalSuppliers} suppliers registered`}
                />
                <StatCard
                  title="Net Wallet Balance"
                  value={`Rs ${stats.khaltiBalance.toLocaleString()}`}
                  icon={DollarSign}
                  subtitle={`${stats.totalTransactions} total transactions`}
                />
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-emerald-900">Cash Snapshot</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white/90 px-3 py-2.5">
                    <span className="text-sm font-medium text-emerald-800">Khalti In</span>
                    <span className="text-base font-semibold text-emerald-950">Rs {stats.khaltiIn.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white/90 px-3 py-2.5">
                    <span className="text-sm font-medium text-emerald-800">Khalti Out</span>
                    <span className="text-base font-semibold text-emerald-950">Rs {stats.khaltiOut.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Revenue vs Purchase Flow</h3>
                    <p className="text-xs text-slate-500">Compare sales and purchases over time</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTimeFilter('days')}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        timeFilter === 'days'
                          ? 'bg-teal-500 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50'
                      }`}
                    >
                      Days
                    </button>
                    <button
                      onClick={() => setTimeFilter('weeks')}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        timeFilter === 'weeks'
                          ? 'bg-teal-500 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50'
                      }`}
                    >
                      Weeks
                    </button>
                    <button
                      onClick={() => setTimeFilter('months')}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        timeFilter === 'months'
                          ? 'bg-teal-500 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50'
                      }`}
                    >
                      Months
                    </button>
                  </div>
                </div>
                <div className="h-72">
                  {getOverviewData().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getOverviewData()} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0f766e" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="purchaseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value: any, name: string) => [`Rs ${Number(value).toLocaleString()}`, name]} />
                        <Legend />
                        <Area type="monotone" dataKey="sales" name="Sales" stroke="#0f766e" fill="url(#salesGradient)" strokeWidth={2} />
                        <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#0ea5e9" fill="url(#purchaseGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                      No data available yet
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Sales Trend</h3>
                <p className="text-xs text-slate-500">Revenue over time</p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getOverviewData()}>
                      <defs>
                        <linearGradient id="salesBarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f766e" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <Tooltip 
                        formatter={(value: any) => [`Rs ${Number(value).toLocaleString()}`, 'Sales']}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Bar dataKey="sales" fill="url(#salesBarGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Top Customers</h3>
                <p className="text-xs text-slate-500">By total spending</p>
                <div className="mt-4 h-64">
                  {(() => {
                    const topCustomers = getTopCustomersForPeriod()
                    return topCustomers.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCustomers} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={90} />
                          <Tooltip formatter={(value: any) => [`Rs ${Number(value).toLocaleString()}`, 'Spent']} />
                          <Bar dataKey="amount" fill="#14b8a6" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                        No customer data yet
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Sales by Category</h3>
                <p className="text-xs text-slate-500">Revenue distribution</p>
                <div className="mt-4 h-64">
                  {(() => {
                    const categorySales = getCategorySalesForPeriod()
                    return categorySales.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categorySales}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            paddingAngle={2}
                            label={(entry) => `${entry.name}: ${((entry.value / categorySales.reduce((sum: number, item: any) => sum + item.value, 0)) * 100).toFixed(0)}%`}
                          >
                            {categorySales.map((entry: any, index: number) => {
                              const colors = ['#0f766e', '#14b8a6', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6']
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            })}
                          </Pie>
                          <Tooltip formatter={(value: any) => [`Rs ${Number(value).toLocaleString()}`, 'Sales']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                        No category sales data yet
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Best Selling Items</h3>
                    <p className="text-xs text-slate-500">Top products by quantity sold</p>
                  </div>
                  <button
                    onClick={() => navigate('/sales')}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-teal-200 hover:bg-teal-50"
                  >
                    View Sales
                  </button>
                </div>
                <div className="space-y-2">
                  {(() => {
                    // Calculate best selling items from sales data
                    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()
                    
                    salesData.forEach((sale: any) => {
                      if (sale.items && Array.isArray(sale.items)) {
                        sale.items.forEach((item: any) => {
                          const existing = productMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 }
                          productMap.set(item.name, {
                            name: item.name,
                            quantity: existing.quantity + (item.quantity || 0),
                            revenue: existing.revenue + ((item.price || 0) * (item.quantity || 0))
                          })
                        })
                      }
                    })
                    
                    const bestSellers = Array.from(productMap.values())
                      .sort((a, b) => b.quantity - a.quantity)
                      .slice(0, 5)
                    
                    if (bestSellers.length === 0) {
                      return (
                        <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                          <div className="text-center">
                            <div className="mx-auto mb-2 rounded-full bg-teal-100 p-3 w-fit">
                              <TrendingUp className="h-6 w-6 text-teal-600" />
                            </div>
                            <p className="text-sm font-medium text-slate-700">No sales yet</p>
                            <p className="text-xs text-slate-500">Start selling to see top items</p>
                          </div>
                        </div>
                      )
                    }
                    
                    return bestSellers.map((product, index) => (
                      <div key={index} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{product.name}</p>
                            <p className="text-xs text-slate-500">Rs {product.revenue.toLocaleString()} revenue</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-teal-700">{product.quantity}</p>
                          <p className="text-xs text-slate-500">sold</p>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">Top Stocked Products</h3>
                  <button
                    onClick={() => navigate('/inventory')}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-teal-200 hover:bg-teal-50"
                  >
                    View Inventory
                  </button>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.stockGraphData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={90} />
                      <Tooltip formatter={(value: any) => [value, 'Qty']} />
                      <Bar dataKey="quantity" name="Quantity" fill="#0f766e" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
              <p className="text-sm text-slate-600">Common tasks at your fingertips</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              <button
                onClick={() => navigate('/billing')}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100/60"
              >
                <div className="rounded-xl bg-teal-50 p-3 transition-transform group-hover:scale-110">
                  <ShoppingCart className="h-5 w-5 text-teal-700" />
                </div>
                <span className="text-sm font-semibold text-slate-700">New Sale</span>
              </button>
              <button
                onClick={() => navigate('/purchases')}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100/60"
              >
                <div className="rounded-xl bg-blue-50 p-3 transition-transform group-hover:scale-110">
                  <Truck className="h-5 w-5 text-blue-700" />
                </div>
                <span className="text-sm font-semibold text-slate-700">New Purchase</span>
              </button>
              <button
                onClick={() => navigate('/inventory')}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100/60"
              >
                <div className="rounded-xl bg-purple-50 p-3 transition-transform group-hover:scale-110">
                  <Package className="h-5 w-5 text-purple-700" />
                </div>
                <span className="text-sm font-semibold text-slate-700">Inventory</span>
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100/60"
              >
                <div className="rounded-xl bg-amber-50 p-3 transition-transform group-hover:scale-110">
                  <TrendingUp className="h-5 w-5 text-amber-700" />
                </div>
                <span className="text-sm font-semibold text-slate-700">Reports</span>
              </button>
              <button
                onClick={() => navigate('/customers')}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100/60"
              >
                <div className="rounded-xl bg-emerald-50 p-3 transition-transform group-hover:scale-110">
                  <Users className="h-5 w-5 text-emerald-700" />
                </div>
                <span className="text-sm font-semibold text-slate-700">Customers</span>
              </button>
              <button
                onClick={() => navigate('/invoices')}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100/60"
              >
                <div className="rounded-xl bg-rose-50 p-3 transition-transform group-hover:scale-110">
                  <FileText className="h-5 w-5 text-rose-700" />
                </div>
                <span className="text-sm font-semibold text-slate-700">Invoices</span>
              </button>
            </div>
          </div>
      </div>
    </Layout>
  )
}

export default Dashboard
