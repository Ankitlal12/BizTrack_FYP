import React, { useEffect, useState, useMemo } from 'react'
import { PlusIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Layout from '../layout/Layout'
import { purchasesAPI, invoicesAPI } from '../services/api'
import { Purchase } from './Purchases/types'
import { buildPurchasesQueryString } from './Purchases/utils'
import PurchaseFilters from './Purchases/PurchaseFilters'
import PurchaseTable from './Purchases/PurchaseTable'
import NewPurchaseOrderModal from './Purchases/NewPurchaseOrderModal'
import PaymentEntryModal from '../components/PaymentEntryModal'

const Purchases: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [totalMin, setTotalMin] = useState('')
  const [totalMax, setTotalMax] = useState('')
  const [quantityMin, setQuantityMin] = useState('')
  const [quantityMax, setQuantityMax] = useState('')
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null)
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false)
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<string | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)

  useEffect(() => {
    loadPurchases()
  }, [searchTerm, sortField, sortDirection, filterStatus, paymentStatusFilter, paymentMethodFilter, supplierFilter, dateFrom, dateTo, totalMin, totalMax, quantityMin, quantityMax, pagination.current])

  const loadPurchases = async () => {
    setIsLoading(true)
    try {
      const queryString = buildPurchasesQueryString({
        page: pagination.current,
        limit: pagination.limit,
        search: searchTerm,
        status: filterStatus,
        paymentStatus: paymentStatusFilter,
        paymentMethod: paymentMethodFilter,
        supplierName: supplierFilter,
        dateFrom,
        dateTo,
        totalMin,
        totalMax,
        quantityMin,
        quantityMax,
        sortBy: sortField,
        sortOrder: sortDirection,
      })

      const response = await purchasesAPI.getAll(queryString)
      
      // Handle both old and new API response formats
      if (response.purchases) {
        // New paginated format
        setPurchases(response.purchases)
        setPagination(response.pagination)
      } else {
        // Old format (fallback)
        setPurchases(response)
        setPagination({
          current: 1,
          pages: 1,
          total: response.length,
          limit: response.length,
        })
      }
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
      // Reload to ensure pagination is correct
      await loadPurchases()
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

  const handleRecordPayment = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setShowPaymentModal(true)
  }

  const handleSavePayment = async (paymentData: { amount: number; date: string; method: string; notes?: string }) => {
    if (!selectedPurchase?._id) {
      toast.error('No purchase selected')
      return
    }

    try {
      const updatedPurchase = await purchasesAPI.recordPayment(selectedPurchase._id, paymentData)
      
      // Update the purchase in the list
      setPurchases((prevPurchases) =>
        prevPurchases.map((purchase) => (purchase._id === selectedPurchase._id ? updatedPurchase : purchase))
      )
      
      // Reload to ensure consistency
      await loadPurchases()
    } catch (error: any) {
      throw error // Let the modal handle the error display
    }
  }

  const handleViewInvoice = async (purchaseId: string) => {
    try {
      // Find the invoice related to this purchase
      const response = await invoicesAPI.getAll(`relatedId=${purchaseId}&type=purchase`)
      
      if (response.invoices && response.invoices.length > 0) {
        const invoice = response.invoices[0]
        // Navigate to the invoices page with the specific invoice highlighted
        navigate(`/invoices?highlight=${invoice._id}`)
      } else {
        toast.error('No invoice found for this purchase')
      }
    } catch (error: any) {
      console.error('Error finding invoice:', error)
      toast.error('Failed to find invoice for this purchase')
    }
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current: page }))
  }

  const suppliers = useMemo(
    () => Array.from(new Set(purchases.map((p) => p.supplierName))).sort(),
    [purchases],
  )

  const clearFilters = () => {
    setFilterStatus('all')
    setPaymentStatusFilter('all')
    setPaymentMethodFilter('all')
    setSupplierFilter('all')
    setDateFrom('')
    setDateTo('')
    setTotalMin('')
    setTotalMax('')
    setQuantityMin('')
    setQuantityMax('')
    setSearchTerm('')
    setPagination(prev => ({ ...prev, current: 1 }))
  }

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
            paymentStatusFilter={paymentStatusFilter}
            onPaymentStatusChange={setPaymentStatusFilter}
            paymentMethodFilter={paymentMethodFilter}
            onPaymentMethodChange={setPaymentMethodFilter}
            supplierFilter={supplierFilter}
            onSupplierChange={setSupplierFilter}
            suppliers={suppliers}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            totalMin={totalMin}
            onTotalMinChange={setTotalMin}
            totalMax={totalMax}
            onTotalMaxChange={setTotalMax}
            quantityMin={quantityMin}
            onQuantityMinChange={setQuantityMin}
            quantityMax={quantityMax}
            onQuantityMaxChange={setQuantityMax}
            onClearFilters={clearFilters}
          />
          <PurchaseTable
            purchases={purchases}
            sortField={sortField}
            sortDirection={sortDirection}
            expandedPurchase={expandedPurchase}
            editingPaymentStatus={editingPaymentStatus}
            onSort={handleSort}
            onToggleExpand={toggleExpandPurchase}
            onPaymentStatusChange={updatePaymentStatus}
            onEditPaymentStatus={setEditingPaymentStatus}
            onRecordPayment={handleRecordPayment}
            onViewInvoice={handleViewInvoice}
          />
          {isLoading && (
            <div className="p-6 text-center text-gray-500">
              Loading purchases...
            </div>
          )}
          {purchases.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                No purchase orders found matching your criteria.
              </p>
            </div>
          )}
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6 p-4 border-t">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.current * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.current - 1)}
                  disabled={pagination.current === 1}
                  className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {[...Array(pagination.pages)].map((_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 text-sm rounded-md ${
                        page === pagination.current
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(pagination.current + 1)}
                  disabled={pagination.current === pagination.pages}
                  className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        <NewPurchaseOrderModal
          isOpen={showNewPurchaseModal}
          onClose={() => setShowNewPurchaseModal(false)}
          onSave={handleAddPurchase}
        />
        {selectedPurchase && (
          <PaymentEntryModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false)
              setSelectedPurchase(null)
            }}
            onSave={handleSavePayment}
            totalAmount={selectedPurchase.total}
            paidAmount={selectedPurchase.paidAmount || 0}
            title={`Record Payment - ${selectedPurchase.purchaseNumber}`}
            paymentMethods={['cash', 'card', 'bank_transfer', 'credit', 'other']}
          />
        )}
      </div>
    </Layout>
  )
}

export default Purchases
