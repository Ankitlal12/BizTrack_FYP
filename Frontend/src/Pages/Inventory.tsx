import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { TrendingDown } from 'lucide-react'
import Layout from '../layout/Layout'
import { inventoryAPI, notificationsAPI } from '../services/api'
import { InventoryItem } from './Inventory/helpers'
import InventoryFilters from './Inventory/InventoryFilters'
import InventoryTable from './Inventory/InventoryTable'
import InventorySummary from './Inventory/InventorySummary'
import { useAuth } from '../contexts/AuthContext'

const Inventory = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [stockMin, setStockMin] = useState('')
  const [stockMax, setStockMax] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [costMin, setCostMin] = useState('')
  const [costMax, setCostMax] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'stock' | 'price'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
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

  useEffect(() => {
    if (inventoryItems.length > 0) {
      checkExpiringItems()
    }
  }, [inventoryItems])

  const checkExpiringItems = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const expiringSoon = inventoryItems.filter((item) => {
      if (!item.expiryDate) return false
      
      const expiryDate = new Date(item.expiryDate)
      expiryDate.setHours(0, 0, 0, 0)
      
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      return daysUntilExpiry <= 2 && daysUntilExpiry >= 0
    })
    
    const expired = inventoryItems.filter((item) => {
      if (!item.expiryDate) return false
      
      const expiryDate = new Date(item.expiryDate)
      expiryDate.setHours(0, 0, 0, 0)
      
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      return daysUntilExpiry < 0
    })

    if (expired.length > 0) {
      toast.error(`${expired.length} item(s) have expired`, {
        description: 'Do not sell or use these items. Remove them from inventory immediately.',
      })
    }

    if (expiringSoon.length > 0) {
      toast.warning(`${expiringSoon.length} item(s) expiring within 2 days`, {
        description: 'Sell or use these items quickly to avoid waste.',
      })
    }
  }

  // Calculate expiring items for banner
  const getExpiringItems = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const expiringSoon = inventoryItems.filter((item) => {
      if (!item.expiryDate) return false
      
      const expiryDate = new Date(item.expiryDate)
      expiryDate.setHours(0, 0, 0, 0)
      
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      return daysUntilExpiry <= 2 && daysUntilExpiry >= 0
    })
    
    const expired = inventoryItems.filter((item) => {
      if (!item.expiryDate) return false
      
      const expiryDate = new Date(item.expiryDate)
      expiryDate.setHours(0, 0, 0, 0)
      
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      return daysUntilExpiry < 0
    })

    return { expiringSoon, expired }
  }

  const { expiringSoon, expired } = getExpiringItems()

  const loadInventory = async () => {
    setIsLoading(true)
    try {
      const items = await inventoryAPI.getAll()
      setInventoryItems(items)
      if (items.length === 0) {
        toast.info('Inventory is empty', {
          description: 'Click "Add Item" to add your first inventory item.',
        })
      }
    } catch (error: any) {
      console.error('Failed to load inventory:', error)
      let errorMessage = 'Failed to load inventory'
      let errorDescription = 'Please try again later.'

      if (
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError')
      ) {
        errorMessage = 'Cannot connect to server'
        errorDescription =
          'Make sure the backend server is running on http://localhost:5000'
      } else if (error.message?.includes('Database not connected')) {
        errorMessage = 'Database connection error'
        errorDescription =
          'The server cannot connect to MongoDB. Please check the backend console.'
      } else if (error.message) {
        errorDescription = error.message
      }

      toast.error(errorMessage, {
        description: errorDescription,
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkLowStockItems = () => {
    const critical = inventoryItems.filter((item) => item.stock === 0)
    const low = inventoryItems.filter((item) => item.stock > 0 && item.stock < 5)

    if (critical.length > 0) {
      toast.error(`${critical.length} item(s) out of stock`, {
        description: 'Restock needed immediately.',
      })
    }

    if (low.length > 0) {
      toast.warning(`${low.length} item(s) running low`, {
        description: 'Below 5 units.',
      })
    }
  }

  const categories = useMemo(
    () => ['all', ...new Set(inventoryItems.map((i) => i.category))],
    [inventoryItems],
  )

  const suppliers = useMemo(
    () => Array.from(new Set(inventoryItems.map((i) => i.supplier))).sort(),
    [inventoryItems],
  )

  const clearFilters = () => {
    setCategoryFilter('all')
    setStatusFilter('all')
    setSupplierFilter('all')
    setStockMin('')
    setStockMax('')
    setPriceMin('')
    setPriceMax('')
    setCostMin('')
    setCostMax('')
    setSortBy('createdAt')
    setSortOrder('desc')
    setPagination(prev => ({ ...prev, current: 1 })) // Reset to first page when clearing filters
  }

  const filteredItems = useMemo(
    () => {
      let filtered = inventoryItems.filter((item) => {
        // Search filter
        const matchesSearch =
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase())

        // Category filter
        const matchesCategory =
          categoryFilter === 'all' || item.category === categoryFilter

        // Status filter
        let matchesStatus = true
        if (statusFilter !== 'all') {
          const itemStatus = item.stock <= 0 ? 'out-of-stock' : item.stock < 5 ? 'low' : 'in-stock'
          matchesStatus = itemStatus === statusFilter
        }

        // Supplier filter
        const matchesSupplier =
          supplierFilter === 'all' || item.supplier === supplierFilter

        // Stock range filter
        let matchesStock = true
        if (stockMin !== '') {
          const min = parseFloat(stockMin)
          if (!isNaN(min)) {
            matchesStock = matchesStock && item.stock >= min
          }
        }
        if (stockMax !== '') {
          const max = parseFloat(stockMax)
          if (!isNaN(max)) {
            matchesStock = matchesStock && item.stock <= max
          }
        }

        // Price range filter
        let matchesPrice = true
        if (priceMin !== '') {
          const min = parseFloat(priceMin)
          if (!isNaN(min)) {
            matchesPrice = matchesPrice && item.price >= min
          }
        }
        if (priceMax !== '') {
          const max = parseFloat(priceMax)
          if (!isNaN(max)) {
            matchesPrice = matchesPrice && item.price <= max
          }
        }

        // Cost range filter
        let matchesCost = true
        if (costMin !== '') {
          const min = parseFloat(costMin)
          if (!isNaN(min)) {
            matchesCost = matchesCost && item.cost >= min
          }
        }
        if (costMax !== '') {
          const max = parseFloat(costMax)
          if (!isNaN(max)) {
            matchesCost = matchesCost && item.cost <= max
          }
        }

        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus &&
          matchesSupplier &&
          matchesStock &&
          matchesPrice &&
          matchesCost
        )
      })

      // Apply sorting
      filtered = [...filtered].sort((a, b) => {
        let comparison = 0
        
        if (sortBy === 'createdAt') {
          const dateA = new Date(a.lastUpdated || 0).getTime()
          const dateB = new Date(b.lastUpdated || 0).getTime()
          comparison = dateA - dateB
        } else if (sortBy === 'name') {
          comparison = a.name.localeCompare(b.name)
        } else if (sortBy === 'stock') {
          comparison = a.stock - b.stock
        } else if (sortBy === 'price') {
          comparison = a.price - b.price
        }
        
        return sortOrder === 'asc' ? comparison : -comparison
      })

      return filtered
    },
    [
      inventoryItems,
      searchTerm,
      categoryFilter,
      statusFilter,
      supplierFilter,
      stockMin,
      stockMax,
      priceMin,
      priceMax,
      costMin,
      costMax,
      sortBy,
      sortOrder,
    ],
  )

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
  }, [searchTerm, categoryFilter, statusFilter, supplierFilter, stockMin, stockMax, priceMin, priceMax, costMin, costMax, sortBy, sortOrder])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current: page }))
  }

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Inventory</h2>
            <p className="text-gray-600">
              Manage your items efficiently 
              {totalItems > 0 && (
                <span className="ml-2 text-sm">
                  • {totalItems} item{totalItems !== 1 ? 's' : ''} found
                  {pagination.pages > 1 && ` • Page ${pagination.current} of ${pagination.pages}`}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(user?.role === 'owner' || user?.role === 'manager') && (
              <button
                onClick={() => navigate('/low-stock')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors"
                title="View low stock items"
              >
                <TrendingDown className="w-4 h-4" />
                Low Stock Page
              </button>
            )}
            <button
              onClick={() => navigate('/expiry-management')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              title="View items with expiry dates"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Expiry Management
            </button>
          </div>
        </div>

        {/* Expiry Alerts */}
        {expired.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-red-800">
                    {expired.length} item(s) have expired
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    Do not sell or use these items. Remove them from inventory immediately.
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
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
                }}
                className="ml-4 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                title="Clear all expiry notifications from notification bell"
              >
                Clear Notifications
              </button>
            </div>
          </div>
        )}

        {expiringSoon.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-orange-800">
                    {expiringSoon.length} item(s) expiring within 2 days
                  </h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Sell or use these items quickly to avoid waste.
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
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
                }}
                className="ml-4 px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                title="Clear all expiry notifications from notification bell"
              >
                Clear Notifications
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Stock Level Legend */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Stock Level Indicators:</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                <span className="text-red-700 font-medium">Critical (&lt; 20 units)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
                <span className="text-orange-600 font-medium">Low (20-49 units)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
                <span className="text-gray-600">Normal (50+ units)</span>
              </div>
            </div>
          </div>

          <InventoryFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            categories={categories}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            supplierFilter={supplierFilter}
            onSupplierChange={setSupplierFilter}
            suppliers={suppliers}
            stockMin={stockMin}
            onStockMinChange={setStockMin}
            stockMax={stockMax}
            onStockMaxChange={setStockMax}
            priceMin={priceMin}
            onPriceMinChange={setPriceMin}
            priceMax={priceMax}
            onPriceMaxChange={setPriceMax}
            costMin={costMin}
            onCostMinChange={setCostMin}
            costMax={costMax}
            onCostMaxChange={setCostMax}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            onClearFilters={clearFilters}
          />

          <InventoryTable
            items={paginatedItems}
            isLoading={isLoading}
            onItemUpdated={loadInventory}
            highlightId={highlightId}
          />

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
        </div>

        <InventorySummary items={inventoryItems} />
      </div>
    </Layout>
  )
}

export default Inventory
