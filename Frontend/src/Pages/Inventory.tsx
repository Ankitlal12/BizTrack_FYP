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

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Inventory</h2>
            <p className="text-gray-600">Manage your items efficiently</p>
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
            items={filteredItems}
            isLoading={isLoading}
            onItemUpdated={loadInventory}
          />
        </div>

        <InventorySummary items={inventoryItems} />
      </div>
    </Layout>
  )
}

export default Inventory
