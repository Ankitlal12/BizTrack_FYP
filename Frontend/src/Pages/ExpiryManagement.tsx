import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, AlertTriangle, AlertCircle, Clock, ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Layout from '../layout/Layout'
import { inventoryAPI, notificationsAPI } from '../services/api'
import { InventoryItem } from './Inventory/helpers'
import { useAuth } from '../contexts/AuthContext'

const ExpiryManagement: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'expiry' | 'name' | 'stock'>('expiry')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10,
  })

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    setIsLoading(true)
    try {
      const items = await inventoryAPI.getAll()
      setInventoryItems(items)
    } catch (error) {
      console.error('Failed to load inventory:', error)
      toast.error('Failed to load inventory')
    } finally {
      setIsLoading(false)
    }
  }

  const getExpiryStatus = (expiryDate: string | Date | null | undefined) => {
    if (!expiryDate) return 'no-expiry'
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry < 0) return 'expired'
    if (daysUntilExpiry <= 2) return 'expiring-soon'
    if (daysUntilExpiry <= 7) return 'expiring-week'
    return 'fresh'
  }

  const getDaysUntilExpiry = (expiryDate: string | Date | null | undefined) => {
    if (!expiryDate) return null
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const formatExpiryDate = (expiryDate: string | Date | null | undefined) => {
    if (!expiryDate) return 'No expiry date'
    return new Date(expiryDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filter items with expiry dates
  const itemsWithExpiry = useMemo(() => {
    return inventoryItems.filter(item => item.expiryDate)
  }, [inventoryItems])

  // Apply filters and search
  const filteredItems = useMemo(() => {
    let filtered = itemsWithExpiry

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => getExpiryStatus(item.expiryDate) === statusFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'expiry') {
        const daysA = getDaysUntilExpiry(a.expiryDate) ?? 999999
        const daysB = getDaysUntilExpiry(b.expiryDate) ?? 999999
        comparison = daysA - daysB
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === 'stock') {
        comparison = a.stock - b.stock
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [itemsWithExpiry, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder])

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(itemsWithExpiry.map(item => item.category))).sort()
  }, [itemsWithExpiry])

  // Pagination calculations
  const totalItems = filteredItems.length
  const startIndex = (pagination.current - 1) * pagination.limit
  const endIndex = startIndex + pagination.limit
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  // Update pagination info when filtered items change
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredItems.length / pagination.limit)
    setPagination(prev => ({
      ...prev,
      pages: newTotalPages,
      total: filteredItems.length,
      current: prev.current > newTotalPages ? 1 : prev.current
    }))
  }, [filteredItems, pagination.limit])

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, current: 1 }))
  }, [statusFilter, categoryFilter, searchTerm, sortBy, sortOrder])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current: page }))
  }

  // Calculate stats
  const stats = useMemo(() => {
    const expired = itemsWithExpiry.filter(item => getExpiryStatus(item.expiryDate) === 'expired').length
    const expiringSoon = itemsWithExpiry.filter(item => getExpiryStatus(item.expiryDate) === 'expiring-soon').length
    const expiringWeek = itemsWithExpiry.filter(item => getExpiryStatus(item.expiryDate) === 'expiring-week').length
    const fresh = itemsWithExpiry.filter(item => getExpiryStatus(item.expiryDate) === 'fresh').length
    
    return { expired, expiringSoon, expiringWeek, fresh, total: itemsWithExpiry.length }
  }, [itemsWithExpiry])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'expiring-soon':
        return <AlertCircle className="w-5 h-5 text-orange-600" />
      case 'expiring-week':
        return <Clock className="w-5 h-5 text-yellow-600" />
      default:
        return <Calendar className="w-5 h-5 text-green-600" />
    }
  }

  const handleClearNotifications = async () => {
    try {
      const result = await notificationsAPI.deleteAllExpiry()
      toast.success('Expiry notifications cleared', {
        description: `Removed ${result.totalDeleted} notification(s)`
      })
    } catch (error: any) {
      toast.error('Failed to clear notifications', {
        description: error.message
      })
    }
  }

  const handleViewItem = (itemId: string) => {
    navigate(`/inventory?highlight=${itemId}`)
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/inventory')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Inventory
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expiry Management</h1>
              <p className="text-gray-600">
                Track and manage items with expiry dates
                {totalItems > 0 && (
                  <span className="ml-2 text-sm">
                    • {totalItems} item{totalItems !== 1 ? 's' : ''} found
                    {pagination.pages > 1 && ` • Page ${pagination.current} of ${pagination.pages}`}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {(stats.expired > 0 || stats.expiringSoon > 0) && (
            <button
              onClick={handleClearNotifications}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Notifications
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-sm text-gray-500">Total Items</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-sm text-red-700 font-medium">Expired</h3>
            </div>
            <p className="text-2xl font-bold text-red-700">{stats.expired}</p>
            <p className="text-xs text-red-600">Remove immediately</p>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-200">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
              <h3 className="text-sm text-orange-700 font-medium">Expiring Soon</h3>
            </div>
            <p className="text-2xl font-bold text-orange-700">{stats.expiringSoon}</p>
            <p className="text-xs text-orange-600">Within 2 days</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-200">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-sm text-yellow-700 font-medium">This Week</h3>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{stats.expiringWeek}</p>
            <p className="text-xs text-yellow-600">Within 7 days</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-sm text-green-700 font-medium">Fresh</h3>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats.fresh}</p>
            <p className="text-xs text-green-600">More than 7 days</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, SKU, Category..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="expired">Expired</option>
                <option value="expiring-soon">Expiring Soon (2 days)</option>
                <option value="expiring-week">This Week (7 days)</option>
                <option value="fresh">Fresh (&gt;7 days)</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'expiry' | 'name' | 'stock')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="expiry">Expiry Date</option>
                <option value="name">Name</option>
                <option value="stock">Stock Level</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'expiry' || sortOrder !== 'asc') && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setCategoryFilter('all')
                  setSortBy('expiry')
                  setSortOrder('asc')
                }}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading expiry data...</p>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {filteredItems.length === 0 ? 'No items with expiry dates found' : 'No items on this page'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {filteredItems.length === 0 
                  ? 'Items with expiry dates will appear here' 
                  : `Showing page ${pagination.current} of ${pagination.pages}`
                }
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiry Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days Until Expiry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedItems.map((item) => {
                      const status = getExpiryStatus(item.expiryDate)
                      const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate)
                      const itemId = item._id || item.id

                      return (
                        <tr
                          key={itemId}
                          className={`transition-colors hover:bg-gray-50 ${
                            status === 'expired' ? 'bg-red-50' :
                            status === 'expiring-soon' ? 'bg-orange-50' :
                            status === 'expiring-week' ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(status)}
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                status === 'expired' ? 'bg-red-100 text-red-800 border border-red-200' :
                                status === 'expiring-soon' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                status === 'expiring-week' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                'bg-green-100 text-green-800 border border-green-200'
                              }`}>
                                {status === 'expired' ? 'EXPIRED' :
                                 status === 'expiring-soon' ? 'SOON' :
                                 status === 'expiring-week' ? 'THIS WEEK' : 'FRESH'}
                              </span>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">{item.category}</div>
                              <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatExpiryDate(item.expiryDate)}</div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-lg font-bold ${
                              daysUntilExpiry !== null && daysUntilExpiry < 0 ? 'text-red-700' :
                              daysUntilExpiry !== null && daysUntilExpiry <= 2 ? 'text-orange-600' :
                              daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {daysUntilExpiry !== null ? (
                                daysUntilExpiry < 0 ? `${Math.abs(daysUntilExpiry)} days ago` :
                                daysUntilExpiry === 0 ? 'Today' :
                                daysUntilExpiry === 1 ? 'Tomorrow' :
                                `${daysUntilExpiry} days`
                              ) : 'N/A'}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{item.stock} units</div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => itemId && handleViewItem(String(itemId))}
                              disabled={!itemId}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 border-t">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.current - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.current * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} results
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Per page:</label>
                      <select
                        value={pagination.limit}
                        onChange={(e) => {
                          const newLimit = parseInt(e.target.value)
                          setPagination(prev => ({
                            ...prev,
                            limit: newLimit,
                            current: 1,
                            pages: Math.ceil(prev.total / newLimit)
                          }))
                        }}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                  {pagination.pages > 1 && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.current === 1}
                        className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        First
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.current - 1)}
                        disabled={pagination.current === 1}
                        className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {(() => {
                        const pages: (number | string)[] = [];
                        const total = pagination.pages;
                        const current = pagination.current;
                        
                        if (total <= 7) {
                          for (let i = 1; i <= total; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (current > 3) pages.push('...');
                          
                          const start = Math.max(2, current - 1);
                          const end = Math.min(total - 1, current + 1);
                          
                          for (let i = start; i <= end; i++) pages.push(i);
                          
                          if (current < total - 2) pages.push('...');
                          pages.push(total);
                        }
                        
                        return pages.map((page, idx) => (
                          page === '...' ? (
                            <span key={`ellipsis-${idx}`} className="px-3 py-2 text-sm text-gray-500">...</span>
                          ) : (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page as number)}
                              className={`px-3 py-2 text-sm rounded-md ${
                                page === current
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        ));
                      })()}
                      <button
                        onClick={() => handlePageChange(pagination.current + 1)}
                        disabled={pagination.current === pagination.pages}
                        className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.pages)}
                        disabled={pagination.current === pagination.pages}
                        className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Last
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Summary Footer */}
        {(stats.expired > 0 || stats.expiringSoon > 0) && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Urgent Action Required
                </h3>
                <p className="text-sm text-red-700">
                  {stats.expired > 0 && `${stats.expired} item(s) have expired and must be removed. `}
                  {stats.expiringSoon > 0 && `${stats.expiringSoon} item(s) expiring within 2 days.`}
                  {pagination.pages > 1 && ` (Showing page ${pagination.current} of ${pagination.pages})`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ExpiryManagement
