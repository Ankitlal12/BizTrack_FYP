import React, { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react'
import Layout from '../layout/Layout'
import { api } from '../services/api'
import { toast } from 'sonner'

interface RevenueData {
  summary: {
    totalCustomers: number
    activeCustomers: number
    inactiveCustomers: number
    churnRate: string
    totalMRR: number
  }
  mrrByPlan: Record<string, { count: number; monthlyRevenue: number }>
  planDistribution: Array<{
    planId: string
    planName: string
    count: number
    percentage: string
  }>
  revenueByMonth: Array<{
    _id: { year: number; month: number }
    totalSales: number
    count: number
  }>
  topCustomers: Array<{
    _id: string
    totalSales: number
    transactionCount: number
  }>
}

interface UsageData {
  totalTransactions: number
  totalSales: number
  totalPurchases: number
  totalCustomers: number
  avgTransactionsPerCustomer: number
  mostActiveCustomers: Array<{
    _id: string
    transactionCount: number
  }>
}

const AdminRevenueD ashboard = () => {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [revenueRes, usageRes] = await Promise.all([
        api.get('/admin/stats/revenue?months=12'),
        api.get('/admin/stats/usage'),
      ])

      setRevenueData(revenueRes.data)
      setUsageData(usageRes.data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load revenue data')
      toast.error('Failed to load revenue data')
    } finally {
      setIsLoading(false)
    }
  }

  const monthlyChartData = revenueData?.revenueByMonth.map(item => ({
    month: `${item._id.month}/${item._id.year}`,
    sales: (item.totalSales / 100000).toFixed(2), // Scale for readability
    count: item.count,
  })) || []

  const planDistributionData = revenueData?.planDistribution.map(plan => ({
    name: plan.planName,
    value: plan.count,
  })) || []

  const colors = ['#14b8a6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444']

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Platform-wide business metrics and insights</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="h-12 w-12 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            {revenueData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{revenueData.summary.totalCustomers}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {revenueData.summary.activeCustomers} active
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-600">Monthly Recurring Revenue</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    Rs {(revenueData.summary.totalMRR || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">+Estimated annual: Rs {((revenueData.summary.totalMRR || 0) * 12).toLocaleString()}</p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-600">Active Rate</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {revenueData.summary.totalCustomers > 0
                      ? (
                          (revenueData.summary.activeCustomers / revenueData.summary.totalCustomers) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Churn: {revenueData.summary.churnRate}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-600">Avg Revenue/Customer</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    Rs{' '}
                    {revenueData.summary.totalCustomers > 0
                      ? (revenueData.summary.totalMRR / revenueData.summary.totalCustomers).toFixed(0)
                      : 0}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{usageData?.totalTransactions || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Sales & Purchases</p>
                </div>
              </div>
            )}

            {/* Revenue by Month */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (12 Months)</h2>
              {monthlyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#14b8a6" name="Sales (Scaled)" />
                    <Line type="monotone" dataKey="count" stroke="#06b6d4" name="Transaction Count" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No data available</p>
              )}
            </div>

            {/* Plan Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Customers by Plan</h2>
                {planDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={planDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {planDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                )}
              </div>

              {/* Plan Details Table */}
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Revenue Breakdown</h2>
                <div className="space-y-3">
                  {revenueData?.planDistribution.map((plan, index) => (
                    <div key={plan.planId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        ></div>
                        <div>
                          <p className="font-semibold text-gray-900">{plan.planName}</p>
                          <p className="text-sm text-gray-600">{plan.count} customers</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          Rs {(revenueData.mrrByPlan[plan.planName]?.monthlyRevenue || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">{plan.percentage}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Usage Metrics */}
            {usageData && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Usage</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded">
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{usageData.totalSales}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded">
                    <p className="text-sm text-gray-600">Total Purchases</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{usageData.totalPurchases}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded">
                    <p className="text-sm text-gray-600">Avg per Customer</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                      {usageData.avgTransactionsPerCustomer}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

export default AdminRevenueD ashboard
