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
  // Installment payment plan
  const [paymentInstallments, setPaymentInstallments] = useState<Array<{id: number; amount: number; dueDate: string; method: string}>>([{id: 1, amount: 0, dueDate: '', method: 'cash'}])
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

  // Installment helpers
  const isFutureDate = (dateStr: string) => {
    if (!dateStr) return false
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    return d > todayStart
  }

  const addInstallment = () => {
    const newId = paymentInstallments.length > 0 ? Math.max(...paymentInstallments.map(i => i.id)) + 1 : 1
    setPaymentInstallments(prev => [...prev, {id: newId, amount: 0, dueDate: '', method: 'cash'}])
  }

  const removeInstallment = (id: number) => {
    if (paymentInstallments.length === 1) {
      setPaymentInstallments([{id: 1, amount: 0, dueDate: '', method: 'cash'}])
      return
    }
    setPaymentInstallments(prev => prev.filter(i => i.id !== id))
  }

  const updateInstallment = (id: number, field: string, value: any) => {
    setPaymentInstallments(prev => prev.map(i => i.id === id ? {...i, [field]: value} : i))
  }

  const immediateTotal = () => paymentInstallments.filter(i => !isFutureDate(i.dueDate)).reduce((s, i) => s + (i.amount || 0), 0)
  const scheduledTotal = () => paymentInstallments.filter(i => isFutureDate(i.dueDate)).reduce((s, i) => s + (i.amount || 0), 0)
  const allocatedTotal = () => paymentInstallments.reduce((s, i) => s + (i.amount || 0), 0)

  const calculatePaymentStatus = (_paid: number, total: number) => {
    const imm = immediateTotal()
    const sched = scheduledTotal()
    if (imm >= total) return 'paid'
    if (imm + sched >= total) return 'scheduled'
    if (imm > 0 || sched > 0) return 'partial'
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
    
    // Validate installment amounts
    const totalAllocated = allocatedTotal()
    if (totalAllocated > subtotal) {
      validationErrors.installments = `Total installment amounts (Rs ${totalAllocated.toFixed(2)}) cannot exceed the purchase total (Rs ${subtotal.toFixed(2)})`
      hasErrors = true
    }
    const activeInstallments = paymentInstallments.filter(i => i.amount > 0)
    activeInstallments.forEach((inst, idx) => {
      if (inst.amount <= 0) {
        validationErrors[`inst_${inst.id}`] = `Installment ${idx + 1} must have a valid amount`
        hasErrors = true
      }
    })

    if (hasErrors) {
      setErrors(validationErrors)
      toast.error('Please fix the validation errors before submitting')
      return
    }

    const paymentStatus = calculatePaymentStatus(0, subtotal)
    const imm = immediateTotal()
    const sched = scheduledTotal()

    // Build installment records for backend
    const installmentRecords = activeInstallments.map(inst => ({
      amount: inst.amount,
      dueDate: inst.dueDate || null,
      method: inst.method,
      status: isFutureDate(inst.dueDate) ? 'scheduled' : 'completed',
    }))

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
      paymentMethod: activeInstallments[0]?.method || 'cash',
      paidAmount: imm,
      scheduledAmount: sched,
      paymentInstallments: installmentRecords,
      paymentStatus,
      status: 'pending',
      expectedDeliveryDate:
        expectedDeliveryDate || new Date().toISOString().split('T')[0],
      notes: notes + (selectedSupplier ? `\n\nSupplier Info:\nContact: ${selectedSupplier.contactPerson || 'N/A'}\nPayment Terms: ${selectedSupplier.paymentTerms}\nLead Time: ${selectedSupplier.averageLeadTimeDays} days` : ''),
    }

    // Check if any immediate installment uses Khalti
    const khaltiInstallment = activeInstallments.find(
      (i) => i.method === 'khalti' && !isFutureDate(i.dueDate)
    )

    if (khaltiInstallment) {
      // Khalti is a collection gateway — it cannot send money out to suppliers.
      // Selecting Khalti here means you are recording that you manually paid
      // the supplier via your Khalti merchant dashboard/app.
      // The system records this as a Khalti outflow to track your wallet balance.
      toast.info('Khalti payment recorded', {
        description: `Rs ${khaltiInstallment.amount} marked as paid via Khalti. Please ensure you have manually transferred this amount to the supplier through your Khalti merchant dashboard.`,
        duration: 6000,
      })
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
          
          {/* Payment Plan */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-medium text-gray-700">Payment Plan</h3>
                <p className="text-xs text-gray-400 mt-0.5">Add installments — leave date empty or set today for immediate payment</p>
              </div>
              <div className="flex gap-2">
                {calculateSubtotal() > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaymentInstallments([{id: 1, amount: calculateSubtotal(), dueDate: '', method: 'cash'}])}
                    className="text-xs bg-teal-100 hover:bg-teal-200 text-teal-700 px-3 py-1.5 rounded"
                  >
                    Pay Full Now
                  </button>
                )}
                <button
                  type="button"
                  onClick={addInstallment}
                  className="flex items-center gap-1 text-sm bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded"
                >
                  <PlusIcon size={14} /> Add Installment
                </button>
              </div>
            </div>

            {/* Installment rows */}
            <div className="space-y-2">
              {paymentInstallments.map((inst, idx) => (
                <div key={inst.id} className="grid grid-cols-12 gap-2 items-end bg-white rounded-lg border border-gray-200 p-3">
                  <div className="col-span-1 text-center">
                    <span className="text-xs text-gray-400 font-medium">#{idx + 1}</span>
                  </div>
                  {/* Amount */}
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">Amount (Rs)</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rs</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        title={`Installment ${idx + 1} amount`}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded py-1.5 pl-7 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                        value={inst.amount || ''}
                        onChange={(e) => updateInstallment(inst.id, 'amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  {/* Due Date */}
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">
                      Due Date
                      {isFutureDate(inst.dueDate) && <span className="ml-1 text-blue-500">(scheduled)</span>}
                      {!isFutureDate(inst.dueDate) && inst.dueDate && <span className="ml-1 text-green-500">(today)</span>}
                      {!inst.dueDate && <span className="ml-1 text-green-500">(immediate)</span>}
                    </label>
                    <input
                      type="date"
                      title={`Installment ${idx + 1} due date`}
                      className="w-full border border-gray-300 rounded py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                      value={inst.dueDate}
                      onChange={(e) => updateInstallment(inst.id, 'dueDate', e.target.value)}
                    />
                  </div>
                  {/* Method */}
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">Method</label>
                    <select
                      title={`Installment ${idx + 1} payment method`}
                      className="w-full border border-gray-300 rounded py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                      value={inst.method}
                      onChange={(e) => updateInstallment(inst.id, 'method', e.target.value)}
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="credit">Credit</option>
                      <option value="khalti">Khalti</option>
                      <option value="other">Other</option>
                    </select>
                    {inst.method === 'khalti' && !isFutureDate(inst.dueDate) && (
                      <p className="text-xs text-purple-600 mt-1">
                        ⚠️ Manual transfer via Khalti dashboard required
                      </p>
                    )}
                  </div>
                  {/* Remove */}
                  <div className="col-span-2 flex justify-end">
                    <button
                      type="button"
                      title="Remove installment"
                      onClick={() => removeInstallment(inst.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {errors.installments && (
              <div className="text-red-500 text-sm">{errors.installments}</div>
            )}

            {/* Payment Summary */}
            {calculateSubtotal() > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Purchase Total:</span>
                  <span className="font-semibold">Rs {calculateSubtotal().toFixed(2)}</span>
                </div>
                {immediateTotal() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paying Now:</span>
                    <span className="font-medium text-green-600">Rs {immediateTotal().toFixed(2)}</span>
                  </div>
                )}
                {scheduledTotal() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Scheduled:</span>
                    <span className="font-medium text-blue-600">Rs {scheduledTotal().toFixed(2)}</span>
                  </div>
                )}
                {allocatedTotal() < calculateSubtotal() && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Unallocated:</span>
                    <span className="font-medium text-orange-600">Rs {(calculateSubtotal() - allocatedTotal()).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-end pt-1 border-t border-gray-100">
                  {(() => {
                    const status = calculatePaymentStatus(0, calculateSubtotal())
                    if (status === 'paid') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Fully Paid</span>
                    if (status === 'scheduled') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Fully Scheduled</span>
                    if (status === 'partial') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Partial</span>
                    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Unpaid</span>
                  })()}
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
