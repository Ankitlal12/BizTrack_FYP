import React, { useEffect, useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import Layout from '../layout/Layout'
import { purchasesAPI } from '../services/api'
import { Purchase } from './Purchases/types'
import { filterAndSortPurchases } from './Purchases/utils'
import PurchaseFilters from './Purchases/PurchaseFilters'
import PurchaseTable from './Purchases/PurchaseTable'
import NewPurchaseOrderModal from './Purchases/NewPurchaseOrderModal'

const Purchases: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null)
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false)
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<string | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadPurchases()
  }, [])

  const loadPurchases = async () => {
    setIsLoading(true)
    try {
      const data = await purchasesAPI.getAll()
      setPurchases(data)
    } catch (error: any) {
      console.error('Failed to load purchases:', error)
      toast.error('Failed to load purchases', {
        description:
          error?.message ||
          'Check that the backend server is running and reachable.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleExpandPurchase = (id: string | null) => {
    setExpandedPurchase(expandedPurchase === id ? null : id)
  }

  const handleAddPurchase = async (newPurchase: Purchase) => {
    try {
      const created = await purchasesAPI.create(newPurchase)
      setPurchases((prev) => [created, ...prev])
      setExpandedPurchase(created._id || created.purchaseNumber)
      toast.success('Purchase order created')
    } catch (error: any) {
      console.error('Failed to create purchase:', error)
      toast.error('Failed to create purchase', {
        description: error?.message || 'Please try again.',
      })
    }
  }

  const updatePaymentStatus = async (purchaseId: string, newStatus: string) => {
    try {
      const updatedPurchase = await purchasesAPI.update(purchaseId, {
        paymentStatus: newStatus,
      })
      setPurchases((prev) =>
        prev.map((purchase) =>
          (purchase._id || purchase.purchaseNumber) === purchaseId
            ? { ...purchase, ...updatedPurchase }
            : purchase,
        ),
      )
      setEditingPaymentStatus(null)
      toast.success('Payment status updated')
    } catch (error: any) {
      console.error('Failed to update payment status:', error)
      toast.error('Failed to update payment status', {
        description: error?.message || 'Please try again.',
      })
    }
  }

  const filteredPurchases = filterAndSortPurchases(
    purchases,
    searchTerm,
    filterStatus,
    sortField,
    sortDirection
  )

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1>
          <button
            className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg flex items-center"
            onClick={() => setShowNewPurchaseModal(true)}
          >
            <PlusIcon size={18} className="mr-1" />
            New Purchase Order
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-sm">
          <PurchaseFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
          />
          <PurchaseTable
            purchases={filteredPurchases}
            sortField={sortField}
            sortDirection={sortDirection}
            expandedPurchase={expandedPurchase}
            editingPaymentStatus={editingPaymentStatus}
            onSort={handleSort}
            onToggleExpand={toggleExpandPurchase}
            onPaymentStatusChange={updatePaymentStatus}
            onEditPaymentStatus={setEditingPaymentStatus}
          />
          {isLoading && (
            <div className="p-6 text-center text-gray-500">
              Loading purchases...
            </div>
          )}
          {filteredPurchases.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                No purchase orders found matching your criteria.
              </p>
            </div>
          )}
          <div className="p-4 border-t">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Showing{' '}
                <span className="font-medium">{filteredPurchases.length}</span> of{' '}
                <span className="font-medium">{purchases.length}</span> purchase
                orders
              </div>
              <div className="flex space-x-1">
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50">
                  Previous
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
        <NewPurchaseOrderModal
          isOpen={showNewPurchaseModal}
          onClose={() => setShowNewPurchaseModal(false)}
          onSave={handleAddPurchase}
        />
      </div>
    </Layout>
  )
}

export default Purchases
