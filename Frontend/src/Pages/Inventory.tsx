import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { TrendingDown } from 'lucide-react'
import Layout from '../layout/Layout'
import { inventoryAPI } from '../services/api'
import { InventoryItem } from './Inventory/helpers'
import InventoryFilters from './Inventory/InventoryFilters'
import InventoryTable from './Inventory/InventoryTable'
import InventorySummary from './Inventory/InventorySummary'
import { useAuth } from '../contexts/AuthContext'

const Inventory = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
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
      checkLowStockItems()
    }
  }, [inventoryItems])

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
    setPagination(prev => ({ ...prev, current: 1 })) // Reset to first page when clearing filters
  }

  const filteredItems = useMemo(
    () => {
      return inventoryItems.filter((item) => {
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
  }, [searchTerm, categoryFilter, statusFilter, supplierFilter, stockMin, stockMax, priceMin, priceMax, costMin, costMax])

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
        </div>

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
            onClearFilters={clearFilters}
          />

          <InventoryTable
            items={paginatedItems}
            isLoading={isLoading}
            onItemUpdated={loadInventory}
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
