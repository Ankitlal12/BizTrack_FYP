import React, { useState, useEffect } from 'react'
import { XIcon, PlusIcon, TrashIcon, SearchIcon, MinusIcon } from 'lucide-react'
import { inventoryAPI, salesAPI } from '../../services/api'
import { toast } from 'sonner'
interface NewSaleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (sale: any) => void
}
const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [customer, setCustomer] = useState<any>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch inventory items when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInventory()
    }
  }, [isOpen])

  const loadInventory = async () => {
    setIsLoadingProducts(true)
    try {
      const inventoryItems = await inventoryAPI.getAll()
      // Transform inventory items to products format
      const transformedProducts = inventoryItems.map((item: any) => ({
        id: item._id,
        _id: item._id,
        name: item.name,
        price: item.price || 0,
        stock: item.stock || 0,
        inventoryId: item._id,
      }))
      setProducts(transformedProducts)
    } catch (error: any) {
      console.error('Failed to load inventory:', error)
      toast.error('Failed to load products', {
        description: error?.message || 'Please try again.',
      })
    } finally {
      setIsLoadingProducts(false)
    }
  }

  if (!isOpen) return null
  const filteredProducts = productSearch
    ? products.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()),
      )
    : products
  const addItem = (product: any) => {
    if (product.stock <= 0) {
      toast.error('Product out of stock', {
        description: `${product.name} is not available.`,
      })
      return
    }
    const existingItem = items.find((item) => item.inventoryId === product._id)
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('Insufficient stock', {
          description: `Only ${product.stock} units available for ${product.name}.`,
        })
        return
      }
      setItems(
        items.map((item) =>
          item.inventoryId === product._id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price,
              }
            : item,
        ),
      )
    } else {
      setItems([
        ...items,
        {
          id: product._id,
          inventoryId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          total: product.price,
        },
      ])
    }
    setShowProductSearch(false)
    setProductSearch('')
  }
  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id)
      return
    }
    const item = items.find((i) => i.id === id)
    const product = products.find((p) => p._id === id)
    if (product && quantity > product.stock) {
      toast.error('Insufficient stock', {
        description: `Only ${product.stock} units available.`,
      })
      return
    }
    setItems(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
              total: quantity * item.price,
            }
          : item,
      ),
    )
  }
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }
  const calculateTax = () => {
    return calculateSubtotal() * 0.07 // 7% tax
  }
  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim() || items.length === 0) {
      toast.error('Validation Error', {
        description: 'Please enter customer name and add at least one product',
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`

      // Transform to backend format
      const saleData = {
        invoiceNumber,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: items.map((item) => ({
          inventoryId: item.inventoryId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        discount: 0,
        total: calculateTotal(),
        paymentMethod: paymentMethod === 'credit_card' ? 'card' : paymentMethod,
        status: 'pending',
        notes: notes.trim() || undefined,
      }

      // Save to backend
      const createdSale = await salesAPI.create(saleData)
      
      // Transform backend response to frontend format for display
      const frontendSale = {
        id: createdSale.invoiceNumber || createdSale._id,
        _id: createdSale._id,
        invoiceNumber: createdSale.invoiceNumber,
        customer: {
          name: createdSale.customerName,
          email: createdSale.customerEmail || '',
          phone: createdSale.customerPhone || '',
        },
        items: createdSale.items || items,
        date: createdSale.createdAt ? new Date(createdSale.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        subtotal: createdSale.subtotal,
        tax: createdSale.tax || 0,
        total: createdSale.total,
        status: createdSale.status || 'pending',
        paymentStatus: paymentMethod === 'cash' ? 'paid' : 'unpaid',
        paymentMethod: createdSale.paymentMethod || paymentMethod,
        notes: createdSale.notes || '',
      }

      onSave(frontendSale)
      toast.success('Sale created successfully')
      
      // Reset form
      setCustomerName('')
      setCustomerEmail('')
      setCustomerPhone('')
      setItems([])
      setNotes('')
      setPaymentMethod('cash')
      onClose()
    } catch (error: any) {
      console.error('Failed to create sale:', error)
      toast.error('Failed to create sale', {
        description: error?.message || 'Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">New Sale</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XIcon size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="customer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Phone
              </label>
              <input
                type="tel"
                className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="555-123-4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>
          {/* Items Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-gray-700">Items</h3>
              <button
                type="button"
                onClick={() => setShowProductSearch(true)}
                className="flex items-center text-teal-600 hover:text-teal-800"
              >
                <PlusIcon size={16} className="mr-1" />
                Add Product
              </button>
            </div>
            {showProductSearch && (
              <div className="mb-4 border border-gray-200 rounded-lg shadow-sm">
                <div className="p-2 border-b">
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                {isLoadingProducts ? (
                  <div className="p-3 text-center text-gray-500">
                    Loading products...
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {filteredProducts.map((p) => (
                      <div
                        key={p._id}
                        className={`p-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center ${
                          p.stock <= 0 ? 'opacity-50' : ''
                        }`}
                        onClick={() => p.stock > 0 && addItem(p)}
                      >
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className={`text-sm ${p.stock <= 0 ? 'text-red-500' : 'text-gray-500'}`}>
                            {p.stock <= 0 ? 'Out of stock' : `In stock: ${p.stock}`}
                          </div>
                        </div>
                        <div className="font-medium">Rs {p.price.toFixed(2)}</div>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="p-3 text-center text-gray-500">
                        No products found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {items.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.name}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          Rs {item.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() =>
                                updateItemQuantity(item.id, item.quantity - 1)
                              }
                            >
                              <MinusIcon size={14} />
                            </button>
                            <span className="w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() =>
                                updateItemQuantity(item.id, item.quantity + 1)
                              }
                            >
                              <PlusIcon size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          Rs {item.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-700"
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
                        colSpan={3}
                        className="px-4 py-2 text-right text-sm font-medium"
                      >
                        Subtotal:
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium">
                        Rs {calculateSubtotal().toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-2 text-right text-sm font-medium"
                      >
                        Tax (7%):
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium">
                        Rs {calculateTax().toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-2 text-right font-medium"
                      >
                        Total:
                      </td>
                      <td className="px-4 py-2 text-right font-bold">
                        Rs {calculateTotal().toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                No items added yet. Click "Add Product" to add items to this
                sale.
              </div>
            )}
          </div>
          {/* Payment Method */}
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
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes about this sale"
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
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!customerName.trim() || items.length === 0 || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default NewSaleModal
