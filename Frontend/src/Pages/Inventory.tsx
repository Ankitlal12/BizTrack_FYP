import React, { useEffect, useState } from 'react'
import Layout from '../layout/Layout'
import {
  SearchIcon,
  FilterIcon,
  PlusIcon,
  TagIcon,
  EditIcon,
  TrashIcon,
  AlertTriangleIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { inventoryAPI } from '../services/api'

type InventoryItem = {
  _id?: string
  id?: string | number
  name: string
  sku: string
  category: string
  price: number
  cost: number
  stock: number
  reorderLevel: number
  supplier: string
  location: string
  lastUpdated?: string | Date
}


const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<InventoryItem>({
    name: '',
    sku: '',
    category: '',
    price: 0,
    cost: 0,
    stock: 0,
    reorderLevel: 5,
    supplier: '',
    location: '',
  })

  // Load inventory on mount
  useEffect(() => {
    loadInventory()
  }, [])

  // Check low stock after loading
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
      
      // More detailed error messages
      let errorMessage = 'Failed to load inventory'
      let errorDescription = 'Please try again later.'
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage = 'Cannot connect to server'
        errorDescription = 'Make sure the backend server is running on http://localhost:5000'
      } else if (error.message?.includes('Database not connected')) {
        errorMessage = 'Database connection error'
        errorDescription = 'The server cannot connect to MongoDB. Please check the backend console.'
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

  const handleAddItem = () => {
    setSelectedItem(null)
    setFormData({
      name: '',
      sku: '',
      category: '',
      price: 0,
      cost: 0,
      stock: 0,
      reorderLevel: 5,
      supplier: '',
      location: '',
    })
    setShowAddModal(true)
  }

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      price: item.price,
      cost: item.cost,
      stock: item.stock,
      reorderLevel: item.reorderLevel,
      supplier: item.supplier,
      location: item.location,
    })
    setShowAddModal(true)
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await inventoryAPI.delete(id)
      toast.success('Item deleted successfully')
      loadInventory()
    } catch (error: any) {
      toast.error('Failed to delete item', {
        description: error.message || 'Please try again.',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (selectedItem?._id) {
        // Update existing item
        await inventoryAPI.update(selectedItem._id, formData)
        toast.success('Item updated successfully')
      } else {
        // Create new item
        await inventoryAPI.create(formData)
        toast.success('Item added successfully')
      }
      setShowAddModal(false)
      loadInventory()
    } catch (error: any) {
      toast.error(selectedItem?._id ? 'Failed to update item' : 'Failed to add item', {
        description: error.message || 'Please try again.',
      })
    }
  }

  const categories = ['all', ...new Set(inventoryItems.map((i) => i.category))]

  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const getStockStatus = (item) => {
    if (item.stock <= 0) return 'out-of-stock'
    if (item.stock < 5) return 'low'
    return 'in-stock'
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'out-of-stock':
        return 'bg-red-100 text-red-800'
      case 'low':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-green-100 text-green-800'
    }
  }

  return (
    <Layout>
      <div className="p-4 space-y-6">

        {/* Title */}
        <h2 className="text-2xl font-semibold text-gray-800">Inventory</h2>
        <p className="text-gray-600">Manage your items efficiently</p>

        {/* SEARCH + FILTER BAR */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-teal-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="border border-gray-300 rounded-lg py-2 px-4"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>

            <button 
              onClick={handleAddItem}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg flex items-center hover:bg-teal-600 transition-colors"
            >
              <PlusIcon size={18} className="mr-1" /> Add Item
            </button>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">Price</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">Location</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500">Actions</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      Loading inventory...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No items found
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const status = getStockStatus(item)
                    const itemId = item._id || item.id

                    return (
                      <tr key={itemId} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.supplier}</div>
                        </td>

                        <td className="px-4 py-4 font-mono text-gray-600">{item.sku}</td>
                        <td className="px-4 py-4">{item.category}</td>

                        <td className="px-4 py-4">
                          <div className="font-medium">${item.price.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">
                            Cost: ${item.cost.toFixed(2)}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className={item.stock < 5 ? 'text-red-600' : ''}>
                            {item.stock}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getStatusClass(status)}`}
                          >
                            {status === 'out-of-stock'
                              ? 'Out of Stock'
                              : status === 'low'
                              ? 'Low Stock'
                              : 'In Stock'}
                          </span>
                        </td>

                        <td className="px-4 py-4">{item.location}</td>

                        <td className="px-4 py-4 text-right">
                          <button 
                            onClick={() => handleEditItem(item)}
                            className="text-teal-600 mr-3 hover:text-teal-700"
                          >
                            <EditIcon size={16} />
                          </button>
                          {item._id && (
                            <button 
                              onClick={() => handleDeleteItem(item._id!)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <TrashIcon size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  {selectedItem?._id ? 'Edit Item' : 'Add New Item'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                  >
                    {selectedItem?._id ? 'Update' : 'Add'} Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h3 className="text-sm text-gray-500">Total Items</h3>
            <p className="text-2xl font-bold">
              {inventoryItems.reduce((sum, item) => sum + item.stock, 0)}
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h3 className="text-sm text-gray-500">Low Stock Items</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {inventoryItems.filter((i) => getStockStatus(i) === 'low').length}
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h3 className="text-sm text-gray-500">Out of Stock</h3>
            <p className="text-2xl font-bold text-red-600">
              {inventoryItems.filter((i) => getStockStatus(i) === 'out-of-stock').length}
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h3 className="text-sm text-gray-500">Inventory Value</h3>
            <p className="text-2xl font-bold">
              $
              {inventoryItems
                .reduce((sum, item) => sum + item.stock * item.cost, 0)
                .toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Inventory
