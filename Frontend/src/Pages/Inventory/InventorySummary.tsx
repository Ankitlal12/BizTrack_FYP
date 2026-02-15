import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react'
import { InventoryItem, getStockStatus, getStockPriority } from './helpers'
import { useAuth } from '../../contexts/AuthContext'

type InventorySummaryProps = {
  items: InventoryItem[]
}

const InventorySummary: React.FC<InventorySummaryProps> = ({ items }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const totals = useMemo(() => {
    const totalStock = items.reduce((sum, item) => sum + item.stock, 0)
    const outOfStock = items.filter((i) => i.stock <= 0).length
    const critical = items.filter((i) => i.stock > 0 && i.stock < 15).length
    const highPriority = items.filter((i) => i.stock >= 15 && i.stock < 25).length
    const lowStock = items.filter((i) => i.stock >= 25 && i.stock < 50).length
    const needsReorder = items.filter((i) => i.stock < 25).length // Items below 25 need reorder
    const inventoryValue = items
      .reduce((sum, item) => sum + item.stock * item.cost, 0)
      .toFixed(2)

    return { totalStock, outOfStock, critical, highPriority, lowStock, needsReorder, inventoryValue }
  }, [items])

  const handleViewLowStock = () => {
    navigate('/low-stock')
  }
  return (
    <div className="space-y-6">
      {/* Priority Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm text-gray-500">Total Items</h3>
          <p className="text-2xl font-bold text-gray-900">{totals.totalStock}</p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-sm text-red-700 font-medium">Critical</h3>
          </div>
          <p className="text-2xl font-bold text-red-700">{totals.critical}</p>
          <p className="text-xs text-red-600">Stock &lt; 15</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-200">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="text-sm text-orange-700 font-medium">High Priority</h3>
          </div>
          <p className="text-2xl font-bold text-orange-700">{totals.highPriority}</p>
          <p className="text-xs text-orange-600">Stock 15-24</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-200">
          <h3 className="text-sm text-yellow-700 font-medium">Low Stock</h3>
          <p className="text-2xl font-bold text-yellow-700">{totals.lowStock}</p>
          <p className="text-xs text-yellow-600">Stock 25-49</p>
        </div>

        {user?.role === 'owner' && (
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-sm text-gray-500">Inventory Value</h3>
            <p className="text-2xl font-bold text-gray-900">Rs {totals.inventoryValue}</p>
          </div>
        )}
      </div>

      {/* Out of Stock Alert */}
      {totals.outOfStock > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Out of Stock Alert
                </h3>
                <p className="text-sm text-red-700">
                  {totals.outOfStock} item(s) are completely out of stock
                </p>
              </div>
            </div>
            <button
              onClick={handleViewLowStock}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Reorder Alert Section */}
      {totals.needsReorder > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <RefreshCw className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-orange-800">
                  Reorder Required
                </h3>
                <p className="text-sm text-orange-700">
                  {totals.needsReorder} item(s) need reordering (stock below 25 units)
                </p>
                <div className="mt-1 text-xs text-orange-600">
                  Critical: {totals.critical} | High Priority: {totals.highPriority}
                </div>
              </div>
            </div>
            <button
              onClick={handleViewLowStock}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              View Low Stock
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventorySummary

