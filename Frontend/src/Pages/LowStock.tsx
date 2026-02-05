import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, AlertCircle, Package2, ArrowLeft } from 'lucide-react'
import Layout from '../layout/Layout'
import { inventoryAPI } from '../services/api'
import { InventoryItem, getStockStatus, getStockPriority, getPriorityClass, getStatusText } from './Inventory/helpers'
import SimpleRestockModal from '../components/SimpleRestockModal'
import { useAuth } from '../contexts/AuthContext'

const LowStock: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showRestockModal, setShowRestockModal] = useState(false)

  // Check if user can restock (only owner and manager)
  const canRestock = user?.role === 'owner' || user?.role === 'manager'

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
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestockClick = (item: InventoryItem) => {
    setSelectedItem(item)
    setShowRestockModal(true)
  }

  const handleRestockSuccess = () => {
    setShowRestockModal(false)
    setSelectedItem(null)
    loadInventory() // Reload inventory to reflect changes
  }

  const lowStockItems = useMemo(() => {
    // Filter items that need reordering (stock < 25)
    const filtered = inventoryItems.filter(item => item.stock < 25)
    
    if (priorityFilter === 'all') {
      return filtered
    }
    
    return filtered.filter(item => {
      const priority = getStockPriority(item)
      return priority === priorityFilter
    })
  }, [inventoryItems, priorityFilter])

  const priorityStats = useMemo(() => {
    const outOfStock = lowStockItems.filter(item => item.stock <= 0).length
    const critical = lowStockItems.filter(item => item.stock > 0 && item.stock < 15).length
    const high = lowStockItems.filter(item => item.stock >= 15 && item.stock < 25).length
    
    return { outOfStock, critical, high, total: lowStockItems.length }
  }, [lowStockItems])

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-600" />
      default:
        return <Package2 className="w-5 h-5 text-yellow-600" />
    }
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
              <h1 className="text-2xl font-bold text-gray-900">Low Stock Items</h1>
              <p className="text-gray-600">Items requiring immediate attention (stock below 25 units)</p>
            </div>
          </div>
        </div>

        {/* Priority Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-sm text-gray-500">Total Low Stock</h3>
            <p className="text-2xl font-bold text-gray-900">{priorityStats.total}</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-sm text-red-700 font-medium">Out of Stock</h3>
            </div>
            <p className="text-2xl font-bold text-red-700">{priorityStats.outOfStock}</p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-sm text-red-700 font-medium">Critical</h3>
            </div>
            <p className="text-2xl font-bold text-red-700">{priorityStats.critical}</p>
            <p className="text-xs text-red-600">Stock &lt; 15</p>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-200">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
              <h3 className="text-sm text-orange-700 font-medium">High Priority</h3>
            </div>
            <p className="text-2xl font-bold text-orange-700">{priorityStats.high}</p>
            <p className="text-xs text-orange-600">Stock 15-24</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by Priority:</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical (Stock &lt; 15)</option>
              <option value="high">High Priority (Stock 15-24)</option>
            </select>
          </div>
        </div>

        {/* Low Stock Items Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {!canRestock && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Only owners and managers can restock items. Contact your administrator for restocking permissions.
              </p>
            </div>
          )}
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading low stock items...</p>
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="p-8 text-center">
              <Package2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No low stock items found</p>
              <p className="text-sm text-gray-500 mt-1">All items have sufficient stock levels</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reorder Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action Needed
                    </th>
                    {canRestock && (
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lowStockItems.map((item) => {
                    const status = getStockStatus(item)
                    const priority = getStockPriority(item)
                    const itemId = item._id || item.id

                    return (
                      <tr
                        key={itemId}
                        className={`${getPriorityClass(priority)} transition-colors hover:bg-opacity-75`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getPriorityIcon(priority)}
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                              priority === 'critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                              priority === 'high' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                              'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            }`}>
                              {priority === 'critical' ? 'CRITICAL' :
                               priority === 'high' ? 'HIGH' : 'LOW'}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.category}</div>
                            <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-lg font-bold ${
                            item.stock <= 0 ? 'text-red-700' :
                            item.stock < 15 ? 'text-red-600' : 
                            item.stock < 25 ? 'text-orange-600' : 
                            'text-yellow-600'
                          }`}>
                            {item.stock}
                          </div>
                          <div className="text-xs text-gray-500">units</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            status === 'out-of-stock' ? 'bg-red-100 text-red-800 border-red-200' :
                            status === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                            status === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                            'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }`}>
                            {getStatusText(status)}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.reorderLevel || 5}</div>
                          <div className="text-xs text-gray-500">reorder level</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            priority === 'critical' ? 'bg-red-600 text-white' :
                            priority === 'high' ? 'bg-orange-600 text-white' :
                            'bg-yellow-600 text-white'
                          }`}>
                            {priority === 'critical' ? 'URGENT' :
                             priority === 'high' ? 'REORDER' : 'LOW STOCK'}
                          </span>
                        </td>

                        {canRestock && (
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleRestockClick(item)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                priority === 'critical' 
                                  ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-200' 
                                  : priority === 'high'
                                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200'
                                  : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-200'
                              }`}
                              title={`Restock this item ${priority === 'critical' ? '(URGENT!)' : priority === 'high' ? '(High Priority)' : '(Low Stock)'}`}
                            >
                              <Package2 className="w-4 h-4" />
                              {priority === 'critical' ? 'URGENT' : 
                               priority === 'high' ? 'HIGH' : 'RESTOCK'}
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {lowStockItems.length > 0 && (
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-orange-800">
                  Action Required
                </h3>
                <p className="text-sm text-orange-700">
                  {lowStockItems.length} items need immediate attention. 
                  {priorityStats.critical > 0 && ` ${priorityStats.critical} are critical.`}
                  {priorityStats.outOfStock > 0 && ` ${priorityStats.outOfStock} are out of stock.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Simple Restock Modal - Only for authorized users */}
      {showRestockModal && selectedItem && canRestock && (
        <SimpleRestockModal
          item={selectedItem}
          onClose={() => setShowRestockModal(false)}
          onSuccess={handleRestockSuccess}
        />
      )}
    </Layout>
  )
}

export default LowStock