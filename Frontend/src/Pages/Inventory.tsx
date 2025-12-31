import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Layout from '../layout/Layout'
import { inventoryAPI } from '../services/api'
import { InventoryItem } from './Inventory/helpers'
import InventoryFilters from './Inventory/InventoryFilters'
import InventoryTable from './Inventory/InventoryTable'
import InventorySummary from './Inventory/InventorySummary'

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
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

  const filteredItems = useMemo(
    () =>
      inventoryItems.filter((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesCategory =
          categoryFilter === 'all' || item.category === categoryFilter

        return matchesSearch && matchesCategory
      }),
    [inventoryItems, searchTerm, categoryFilter],
  )

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Inventory</h2>
        <p className="text-gray-600">Manage your items efficiently</p>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <InventoryFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            categories={categories}
          />

          <InventoryTable
            items={filteredItems}
            isLoading={isLoading}
          />
        </div>

        <InventorySummary items={inventoryItems} />
      </div>
    </Layout>
  )
}

export default Inventory
