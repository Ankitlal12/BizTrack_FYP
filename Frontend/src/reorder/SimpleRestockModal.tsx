// ==================== IMPORTS ====================
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, Package, ShoppingCart } from 'lucide-react'
import { inventoryAPI, suppliersAPI, purchasesAPI } from '../services/api'

// ==================== TYPES ====================

interface SimpleRestockModalProps {
  item: {
    _id?: string
    id?: string | number
    name: string
    sku: string
    stock: number
    cost: number
    supplier?: string
    preferredSupplierId?: string
  }
  onClose: () => void
  onSuccess: () => void
}

interface Supplier {
  _id: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
}

// ==================== HELPERS ====================

/**
 * Resolve the best default supplier ID from the loaded list.
 * Priority: preferredSupplierId → name match → first in list
 */
const resolveDefaultSupplier = (
  suppliers: Supplier[],
  preferredSupplierId?: string,
  supplierName?: string
): string => {
  if (preferredSupplierId && suppliers.find(s => s._id === preferredSupplierId)) return preferredSupplierId
  if (supplierName) {
    const match = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase())
    if (match) return match._id
  }
  return suppliers[0]?._id || ''
}

// ==================== COMPONENT ====================

const SimpleRestockModal: React.FC<SimpleRestockModalProps> = ({ item, onClose, onSuccess }) => {
  // ==================== STATE ====================

  const [quantity, setQuantity] = useState(10)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)

  const selectedSupplier = suppliers.find(s => s._id === selectedSupplierId)
  const preferredSupplier = suppliers.find(s =>
    s._id === item.preferredSupplierId ||
    s.name.toLowerCase() === item.supplier?.toLowerCase()
  )
  const isUsingPreferredSupplier = !!selectedSupplierId && (
    selectedSupplierId === item.preferredSupplierId ||
    selectedSupplier?.name.toLowerCase() === item.supplier?.toLowerCase()
  )

  // ==================== DATA LOADING ====================

  useEffect(() => {
    const load = async () => {
      try {
        const response = await suppliersAPI.getAll('isActive=true')
        const list: Supplier[] = response.data || []
        setSuppliers(list)
        // Auto-select best supplier once list is loaded
        setSelectedSupplierId(resolveDefaultSupplier(list, item.preferredSupplierId, item.supplier))
      } catch {
        toast.error('Failed to load suppliers')
      } finally {
        setLoadingSuppliers(false)
      }
    }
    load()
  }, [])

  // ==================== SUBMIT ====================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (quantity <= 0) { toast.error('Quantity must be greater than 0'); return }
    if (!selectedSupplierId) { toast.error('Please select a supplier'); return }

    const itemId = item._id || item.id
    if (!itemId) { toast.error('Item ID is missing'); return }

    try {
      setLoading(true)
      const newStock = item.stock + quantity
      const totalCost = quantity * item.cost

      // Update inventory stock directly
      await inventoryAPI.update(itemId.toString(), { stock: newStock })

      // Create a simple purchase record
      await purchasesAPI.create({
        supplierName:  selectedSupplier?.name  || 'Unknown Supplier',
        supplierEmail: selectedSupplier?.email || '',
        supplierPhone: selectedSupplier?.phone || '',
        items: [{ name: item.name, quantity, cost: item.cost, total: totalCost }],
        subtotal: totalCost,
        total: totalCost,
        status: 'received',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        notes: `Direct restock for ${item.name} - Added ${quantity} units`,
      })

      toast.success(`✅ Restock completed! 📦 ${item.name} restocked with ${quantity} units. 📈 New stock: ${newStock} units.`, { duration: 4000 })
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to restock item')
    } finally {
      setLoading(false)
    }
  }

  // ==================== RENDER ====================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Package className="w-5 h-5 text-blue-600" /></div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Restock Item</h2>
              <p className="text-sm text-gray-600">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Preferred supplier notice */}
          {preferredSupplier && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">ℹ️</span>
              <div>
                <p className="text-sm font-medium text-blue-900">Original Supplier: {preferredSupplier.name}</p>
                <p className="text-xs text-blue-700 mt-1">Using the same supplier ensures consistency.</p>
              </div>
            </div>
          )}

          {/* Stock summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Current Stock: <span className="font-medium">{item.stock} units</span></p>
            <p className="text-sm text-gray-600">New Stock: <span className="font-medium text-green-600">{item.stock + quantity} units</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to Add</label>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter quantity" />
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier {preferredSupplier && <span className="text-xs text-gray-500">(Auto-selected)</span>}
              </label>
              {loadingSuppliers ? (
                <div className="flex items-center justify-center py-4"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <>
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isUsingPreferredSupplier ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                    required
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                        {(s._id === item.preferredSupplierId || s.name.toLowerCase() === item.supplier?.toLowerCase()) && ' ⭐ (Original)'}
                      </option>
                    ))}
                  </select>
                  {isUsingPreferredSupplier && <p className="text-xs text-green-600 mt-1">✓ Using original supplier — Recommended for consistency</p>}
                  {!isUsingPreferredSupplier && selectedSupplierId && preferredSupplier && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ Different supplier selected — Original was {preferredSupplier.name}</p>
                  )}
                </>
              )}
            </div>

            {/* Cost */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">Estimated Cost: <span className="font-medium text-green-700">Rs {(quantity * item.cost).toFixed(2)}</span></p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={loading || !selectedSupplierId || quantity <= 0} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><ShoppingCart className="w-4 h-4" />Restock Now</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SimpleRestockModal
