import React, { useState } from 'react'
import { XIcon, PlusIcon, TrashIcon } from 'lucide-react'
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
  const [supplier, setSupplier] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [items, setItems] = useState([
    {
      id: 1,
      name: '',
      category: '',
      quantity: 1,
      costPrice: 0,
      sellingPrice: 0,
      total: 0,
    },
  ])
  const [notes, setNotes] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('unpaid')
  // Common product categories
  const categories = [
    'Electronics',
    'Office Supplies',
    'Furniture',
    'Storage',
    'Accessories',
    'Audio',
    'Lighting',
    'Networking',
    'Software',
    'Other',
  ]
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const subtotal = calculateSubtotal()
    const newPurchaseOrder = {
      purchaseNumber: `PO-${new Date().getFullYear()}-${Math.floor(
        Math.random() * 1000,
      )
        .toString()
        .padStart(3, '0')}`,
      supplierName: supplier,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        cost: item.costPrice,
        total: item.total,
      })),
      subtotal,
      tax: 0,
      shipping: 0,
      total: subtotal,
      paymentMethod,
      status: 'pending',
      paymentStatus,
      expectedDeliveryDate:
        expectedDeliveryDate || new Date().toISOString().split('T')[0],
      notes,
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
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partially Paid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
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
                        <select
                          className="w-full border border-gray-300 rounded py-1 px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          value={item.category}
                          onChange={(e) =>
                            updateItem(item.id, 'category', e.target.value)
                          }
                          required
                        >
                          <option value="">Select category</option>
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
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
                          className="w-24 border border-gray-300 rounded py-1 px-2 text-right focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        ${item.total.toFixed(2)}
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
                      ${calculateSubtotal().toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
