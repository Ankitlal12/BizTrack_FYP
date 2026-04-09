import React, { useState, useEffect, useMemo } from 'react'
import { Package, Truck, Calendar, Search, RefreshCw, Clock } from 'lucide-react'
import { toast } from 'sonner'
import Layout from '../layout/Layout'
import { purchasesAPI } from '../services/api'

interface UpcomingProduct {
  purchaseId: string
  purchaseNumber: string
  supplierName: string
  expectedDeliveryDate: string
  itemName: string
  category: string
  quantity: number
  costPrice: number
  sellingPrice: number
  total: number
  inventoryId: string | null
  paymentStatus: string
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const daysUntil = (dateStr: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const DeliveryBadge: React.FC<{ date: string }> = ({ date }) => {
  const days = daysUntil(date)
  if (days < 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <Clock size={11} /> Overdue by {Math.abs(days)}d
      </span>
    )
  if (days === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        <Truck size={11} /> Arriving Today
      </span>
    )
  if (days <= 3)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <Clock size={11} /> In {days}d
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      <Calendar size={11} /> In {days}d
    </span>
  )
}

const paymentBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>
    case 'scheduled':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Scheduled</span>
    case 'partial':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Partial</span>
    default:
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Unpaid</span>
  }
}

const UpcomingProducts: React.FC = () => {
  const [products, setProducts] = useState<UpcomingProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDays, setFilterDays] = useState<string>('all')

  const loadUpcoming = async () => {
    setIsLoading(true)
    try {
      const res = await purchasesAPI.getUpcoming()
      setProducts(res.upcomingProducts || [])
    } catch (err: any) {
      console.error('Failed to load upcoming products:', err)
      toast.error('Failed to load incoming stock')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUpcoming()
  }, [])

  const filtered = useMemo(() => {
    let result = [...products]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        p =>
          p.itemName.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.purchaseNumber.toLowerCase().includes(q)
      )
    }

    if (filterDays !== 'all') {
      const days = parseInt(filterDays)
      result = result.filter(p => daysUntil(p.expectedDeliveryDate) <= days)
    }

    return result
  }, [products, search, filterDays])

  const totalIncoming = filtered.reduce((s, p) => s + p.quantity, 0)
  const totalValue = filtered.reduce((s, p) => s + p.total, 0)
  const uniqueSuppliers = new Set(filtered.map(p => p.supplierName)).size

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 rounded-lg p-2">
              <Truck className="text-teal-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Incoming Stock</h1>
              <p className="text-sm text-gray-500">Products awaiting delivery — auto-added to inventory on arrival</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadUpcoming}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Incoming Items</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{filtered.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">{totalIncoming} units total</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Stock Value</p>
            <p className="text-2xl font-bold text-teal-600 mt-1">Rs {totalValue.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">cost price</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Suppliers</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{uniqueSuppliers}</p>
            <p className="text-xs text-gray-400 mt-0.5">pending deliveries</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product, supplier, category, PO#..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            title="Filter by delivery window"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={filterDays}
            onChange={e => setFilterDays(e.target.value)}
          >
            <option value="all">All Deliveries</option>
            <option value="0">Arriving Today</option>
            <option value="3">Within 3 Days</option>
            <option value="7">Within 7 Days</option>
            <option value="14">Within 14 Days</option>
            <option value="30">Within 30 Days</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Package size={48} className="mb-3 opacity-30" />
              <p className="text-lg font-medium">No incoming stock</p>
              <p className="text-sm mt-1">All pending deliveries will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO#</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filtered.map((p, idx) => (
                    <tr key={`${p.purchaseId}-${idx}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                            <Package size={14} className="text-teal-500" />
                          </div>
                          <span className="text-sm font-medium text-gray-800">{p.itemName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{p.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-800">{p.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-700">Rs {p.costPrice.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-800">Rs {p.total.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{p.supplierName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-700">{formatDate(p.expectedDeliveryDate)}</p>
                          <DeliveryBadge date={p.expectedDeliveryDate} />
                        </div>
                      </td>
                      <td className="px-4 py-3">{paymentBadge(p.paymentStatus)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 font-mono">{p.purchaseNumber}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default UpcomingProducts
