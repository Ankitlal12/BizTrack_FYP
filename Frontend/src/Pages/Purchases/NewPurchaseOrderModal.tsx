import React, { useState, useEffect } from 'react'
import { XIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { purchasesAPI } from '../../services/api'
import { toast } from 'sonner'
interface NewPurchaseOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (purchaseOrder: any) => void
}
const NewPurchaseOrderModal: React.FC<NewPurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { user } = useAuth()
  const [supplier, setSupplier] = useState('')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paidAmount, setPaidAmount] = useState(0)
  const [items, setItems] = useState([
    {
      id: 1,
      name: '',
      category: '',
      quantity: 1,
      costPrice: 0,
      sellingPrice: 0,
      total: 0,
      expiryDate: '',
    },
  ])
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  // Load suppliers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSuppliers()
    }
  }, [isOpen])

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true)
      const response = await purchasesAPI.getSuppliers()
      setSuppliers(response.data || [])
    } catch (error: any) {
      console.error('Error loading suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const handleSupplierChange = (supplierId: string) => {
    const selected = suppliers.find(s => s._id === supplierId)
    setSelectedSupplier(selected)
    setSupplier(selected ? selected.name : '')
  }

  // Common product categories with food items
  const [categories, setCategories] = useState([
    'Electronics',
    'Office Supplies',
    'Furniture',
    'Storage',
    'Accessories',
    'Audio',
    'Lighting',
    'Networking',
    'Software',
    'Food & Beverages',
    'Dairy Products',
    'Fresh Produce',
    'Frozen Foods',
    'Bakery Items',
    'Other',
  ])
  const [newCategory, setNewCategory] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories.slice(0, -1), newCategory.trim(), 'Other'])
      setNewCategory('')
      setShowAddCategory(false)
      toast.success(`Category "${newCategory.trim()}" added successfully`)
    }
  }

  // Check if category is food-related
  const isFoodCategory = (category: string) => {
    const foodKeywords = [
      'food', 'beverages', 'dairy', 'produce', 'frozen', 'bakery',
      'meat', 'poultry', 'seafood', 'snacks', 'fresh'
    ]
    return category && foodKeywords.some(keyword => 
      category.toLowerCase().includes(keyword.toLowerCase())
    )
  }
  if (!isOpen) return null
  const addItem = () => {
    const newItem = {
      id: items.length + 1,
      name: '',
      category: '',
      quantity: 1,
      costPrice: 0,
      sellingPrice: 0,
      total: 0,
      expiryDate: '',
    }
    setItems([...items, newItem])
  }
  const removeItem = (id: number) => {
    if (items.length === 1) return
    setItems(items.filter((item) => item.id !== id))
  }
  const updateItem = (id: number, field: string, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = {
            ...item,
            [field]: value,
          }
          
          // Validate selling price vs cost price
          if (field === 'sellingPrice' || field === 'costPrice') {
            const costPrice = field === 'costPrice' ? value : item.costPrice
            const sellingPrice = field === 'sellingPrice' ? value : item.sellingPrice
            
            if (sellingPrice > 0 && costPrice > 0 && sellingPrice < costPrice) {
              setErrors(prev => ({
                ...prev,
                [`item_${id}_sellingPrice`]: `Selling price (Rs ${sellingPrice}) cannot be less than cost price (Rs ${costPrice})`
              }))
            } else {
              setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[`item_${id}_sellingPrice`]
                return newErrors
              })
            }
          }
          
          // Recalculate total if quantity or cost price changes
          if (field === 'quantity' || field === 'costPrice') {
            const quantity = field === 'quantity' ? value : item.quantity
            const costPrice = field === 'costPrice' ? value : item.costPrice
            updatedItem.total = quantity * costPrice
          }
          return updatedItem
        }
        return item
      }),
    )
  }
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  const calculatePaymentStatus = (paidAmount: number, total: number) => {
    if (paidAmount >= total) return 'paid'
    if (paidAmount > 0) return 'partial'
    return 'unpaid'
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all items for selling price vs cost price
    const validationErrors: {[key: string]: string} = {}
    let hasErrors = false
    
    items.forEach(item => {
      if (item.sellingPrice > 0 && item.costPrice > 0 && item.sellingPrice < item.costPrice) {
        validationErrors[`item_${item.id}_sellingPrice`] = `Selling price (Rs ${item.sellingPrice}) cannot be less than cost price (Rs ${item.costPrice}) for ${item.name}`
        hasErrors = true
      }
      
      // Validate expiry date for food items
      if (isFoodCategory(item.category) && !item.expiryDate) {
        validationErrors[`item_${item.id}_expiryDate`] = `Expiry date is required for food item: ${item.name}`
        hasErrors = true
      }
    })
    
    const subtotal = calculateSubtotal()
    
    // Validate payment amount
    if (paidAmount > subtotal) {
      validationErrors.paidAmount = `Payment amount (Rs ${paidAmount.toFixed(2)}) cannot exceed total amount (Rs ${subtotal.toFixed(2)})`
      hasErrors = true
    }
    
    if (hasErrors) {
      setErrors(validationErrors)
      toast.error('Please fix the validation errors before submitting')
      return
    }
    
    const paymentStatus = calculatePaymentStatus(paidAmount, subtotal)
    
    const newPurchaseOrder = {
      purchaseNumber: `PO-${new Date().getFullYear()}-${Math.floor(
        Math.random() * 1000,
      )
        .toString()
        .padStart(3, '0')}`,
      supplierName: supplier,
      supplierId: selectedSupplier?._id || null,
      supplierEmail: selectedSupplier?.email || '',
      supplierPhone: selectedSupplier?.phone || '',
      items: items.map((item) => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        cost: item.costPrice,
        sellingPrice: item.sellingPrice,
        total: item.total,
        expiryDate: item.expiryDate || undefined,
      })),
      subtotal,
      tax: 0,
      shipping: 0,
      total: subtotal,
      paymentMethod,
      paidAmount,
      paymentStatus,
      status: 'pending',
      expectedDeliveryDate:
        expectedDeliveryDate || new Date().toISOString().split('T')[0],
      notes: notes + (selectedSupplier ? `\n\nSupplier Info:\nContact: ${selectedSupplier.contactPerson || 'N/A'}\nPayment Terms: ${selectedSupplier.paymentTerms}\nLead Time: ${selectedSupplier.averageLeadTimeDays} days` : ''),
    }
    onSave(newPurchaseOrder)
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            New Purchase Order
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XIcon size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              {loadingSuppliers ? (
                <div className="w-full border border-gray-300 rounded-lg py-2 px-4 bg-gray-50">
                  Loading suppliers...
                </div>
              ) : (
                <select
                  className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={selectedSupplier?._id || ''}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name} {supplier.contactPerson && `(${supplier.contactPerson})`}
                    </option>
                  ))}
                </select>
              )}
              
              {selectedSupplier && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    {selectedSupplier.email && (
                      <div>
                        <span className="font-medium">Email:</span> {selectedSupplier.email}
                      </div>
                    )}
                    {selectedSupplier.phone && (
                      <div>
                        <span className="font-medium">Phone:</span> {selectedSupplier.phone}
                      </div>
                    )}
                    {selectedSupplier.paymentTerms && (
                      <div>
                        <span className="font-medium">Payment Terms:</span> {selectedSupplier.paymentTerms}
                      </div>
                    )}
                    {selectedSupplier.averageLeadTimeDays && (
                      <div>
                        <span className="font-medium">Lead Time:</span> {selectedSupplier.averageLeadTimeDays} days
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>
          </div>
          
          {/* Payment Section */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="text-md font-medium text-gray-700">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit">Credit</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    Rs
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={calculateSubtotal()}
                    step="0.01"
                    className={`w-full border ${errors.paidAmount ? 'border-red-500' : 'border-gray-300'} rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-teal-500`}
                    value={paidAmount || ''}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0
                      if (amount > calculateSubtotal()) {
                        setErrors(prev => ({
                          ...prev,
                          paidAmount: `Payment amount cannot exceed total amount of Rs ${calculateSubtotal().toFixed(2)}`
                        }))
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.paidAmount
                          return newErrors
                        })
                        setPaidAmount(amount)
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
                
                {errors.paidAmount && (
                  <div className="text-red-500 text-sm mt-1">
                    {errors.paidAmount}
                  </div>
                )}
                
                {/* Quick payment buttons */}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPaidAmount(calculateSubtotal())}
                    className="text-xs bg-teal-100 hover:bg-teal-200 text-teal-700 px-2 py-1 rounded"
                  >
                    Full Amount
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(0)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
            
            {/* Payment Status Display */}
            {calculateSubtotal() > 0 && (
              <div className="bg-white rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">Rs {calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paid Amount:</span>
                  <span className="font-medium">Rs {paidAmount.toFixed(2)}</span>
                </div>
                {paidAmount < calculateSubtotal() && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remaining:</span>
                    <span className="font-medium text-orange-600">Rs {(calculateSubtotal() - paidAmount).toFixed(2)}</span>
                  </div>
                )}
                
                {/* Payment Status Badge */}
                <div className="flex justify-end mt-2">
                  {paidAmount >= calculateSubtotal() ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Fully Paid
                    </span>
                  ) : paidAmount > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Partial Payment
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Unpaid
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Error Messages */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {Object.entries(errors).map(([key, error]) => (
                  <li key={key} className="flex items-start">
                    <span className="text-red-500 mr-1">•</span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Add Category Modal */}
          {showAddCategory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
                  placeholder="Enter category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCategory()
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategory(false)
                      setNewCategory('')
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                    disabled={!newCategory.trim()}
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-gray-700">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center text-teal-600 hover:text-teal-800"
              >
                <PlusIcon size={16} className="mr-1" />
                Add Item
              </button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Selling Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded py-1 px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          value={item.name}
                          onChange={(e) =>
                            updateItem(item.id, 'name', e.target.value)
                          }
                          placeholder="Item name"
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="relative">
                          <select
                            className="w-full border border-gray-300 rounded py-1 px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            value={item.category}
                            onChange={(e) => {
                              if (e.target.value === '__add_new__') {
                                setShowAddCategory(true)
                              } else {
                                updateItem(item.id, 'category', e.target.value)
                              }
                            }}
                            required
                          >
                            <option value="">Select category</option>
                            {categories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                            <option value="__add_new__" className="text-teal-600 font-medium">
                              + Add New Category
                            </option>
                          </select>
                        </div>
                        {isFoodCategory(item.category) && (
                          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            🍽️ Food item
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-20 border border-gray-300 rounded py-1 px-2 text-right focus:outline-none focus:ring-1 focus:ring-teal-500"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              'quantity',
                              parseInt(e.target.value) || 0,
                            )
                          }
                          min="1"
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-24 border border-gray-300 rounded py-1 px-2 text-right focus:outline-none focus:ring-1 focus:ring-teal-500"
                          value={item.costPrice}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              'costPrice',
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          step="0.01"
                          min="0"
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className={`w-24 border ${errors[`item_${item.id}_sellingPrice`] ? 'border-red-500' : 'border-gray-300'} rounded py-1 px-2 text-right focus:outline-none focus:ring-1 focus:ring-teal-500`}
                          value={item.sellingPrice}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              'sellingPrice',
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          step="0.01"
                          min="0"
                          required
                        />
                        {errors[`item_${item.id}_sellingPrice`] && (
                          <div className="text-red-500 text-xs mt-1">
                            {errors[`item_${item.id}_sellingPrice`]}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        Rs {item.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                          disabled={items.length === 1}
                        >
                          <TrashIcon size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-right font-medium"
                    >
                      Total Cost:
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      Rs {calculateSubtotal().toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* Expiry Dates Section - Only show if there are food items */}
            {items.some(item => isFoodCategory(item.category)) && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🍽️</span>
                  <h4 className="text-md font-semibold text-gray-800">Food Items - Expiry Dates Required</h4>
                </div>
                <div className="space-y-3">
                  {items
                    .filter(item => isFoodCategory(item.category))
                    .map((item) => (
                      <div key={item.id} className="bg-white rounded-lg p-3 border border-yellow-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Item Name</label>
                            <div className="text-sm text-gray-900 font-medium mt-1">{item.name || 'Unnamed Item'}</div>
                            <div className="text-xs text-gray-500">{item.category}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Quantity</label>
                            <div className="text-sm text-gray-900 mt-1">{item.quantity} units</div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Expiry Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              className={`w-full border ${errors[`item_${item.id}_expiryDate`] ? 'border-red-500' : 'border-gray-300'} rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                              value={item.expiryDate || ''}
                              onChange={(e) =>
                                updateItem(item.id, 'expiryDate', e.target.value)
                              }
                              min={new Date().toISOString().split('T')[0]}
                              required
                            />
                            {errors[`item_${item.id}_expiryDate`] && (
                              <div className="text-red-500 text-xs mt-1">
                                Required
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-3 text-xs text-gray-600 flex items-start gap-2">
                  <span>ℹ️</span>
                  <span>Expiry dates are required for all food items to ensure product freshness and safety.</span>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes about this purchase order"
            ></textarea>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
            >
              Create Purchase Order
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default NewPurchaseOrderModal
