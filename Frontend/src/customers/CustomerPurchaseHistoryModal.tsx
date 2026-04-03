// ==================== IMPORTS ====================
import React, { useState, useEffect } from 'react'
import { X, Receipt, DollarSign, TrendingUp, AlertCircle, FileText, ExternalLink } from 'lucide-react'
import { customersAPI, invoicesAPI } from '../services/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

// ==================== TYPES ====================

interface CustomerPurchaseHistoryModalProps {
  customerId: string
  customerName: string
  onClose: () => void
}

// ==================== HELPERS ====================

const paymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid':    return 'bg-green-100 text-green-800'
    case 'partial': return 'bg-yellow-100 text-yellow-800'
    case 'unpaid':  return 'bg-red-100 text-red-800'
    default:        return 'bg-gray-100 text-gray-800'
  }
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

/**
 * Find the invoice for a sale using three fallback strategies:
 * 1. Match by invoiceNumber
 * 2. Match by relatedId (sale _id)
 * 3. Auto-generate the invoice
 */
const findOrGenerateInvoice = async (sale: any) => {
  // Strategy 1: by invoice number
  if (sale.invoiceNumber) {
    const res = await invoicesAPI.getAll(new URLSearchParams({ search: sale.invoiceNumber, type: 'sale' }).toString())
    const match = res.invoices?.find((inv: any) => inv.invoiceNumber === sale.invoiceNumber) ?? res.invoices?.[0]
    if (match) return match
  }

  // Strategy 2: by relatedId
  const res2 = await invoicesAPI.getAll(new URLSearchParams({ relatedId: sale._id, type: 'sale' }).toString())
  if (res2.invoices?.length > 0) return res2.invoices[0]

  // Strategy 3: auto-generate
  try {
    const generated = await invoicesAPI.generateFromSale(sale._id)
    toast.success('Invoice generated successfully')
    return generated
  } catch {
    return null
  }
}

// ==================== COMPONENT ====================

const CustomerPurchaseHistoryModal: React.FC<CustomerPurchaseHistoryModalProps> = ({
  customerId, customerName, onClose,
}) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [loadingInvoice, setLoadingInvoice] = useState<string | null>(null)

  // ==================== DATA LOADING ====================

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({ page: page.toString(), limit: '10' })
        const response = await customersAPI.getPurchaseHistory(customerId, params.toString())
        setData(response.data)
      } catch {
        toast.error('Failed to load purchase history')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerId, page])

  // ==================== HANDLERS ====================

  const handleViewInvoice = async (sale: any) => {
    try {
      setLoadingInvoice(sale._id)
      const invoice = await findOrGenerateInvoice(sale)
      if (invoice) {
        navigate(`/invoices/${invoice._id}`)
        onClose()
      } else {
        toast.error('Invoice not found', { description: 'Could not find or generate an invoice for this sale.' })
      }
    } catch {
      toast.error('Failed to load invoice')
    } finally {
      setLoadingInvoice(null)
    }
  }

  // ==================== RENDER ====================

  if (loading && !data) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg"><Receipt className="w-5 h-5 text-teal-600" /></div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Purchase History</h2>
              <p className="text-sm text-gray-600">{customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Close modal" aria-label="Close modal">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {data && (
          <>
            {/* Financial summary */}
            <div className="p-4 sm:p-6 border-b bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <DollarSign className="w-4 h-4" />, label: 'Total Purchased', value: `Rs ${data.financialSummary.totalPurchased.toFixed(2)}`, color: 'text-gray-900' },
                  { icon: <TrendingUp className="w-4 h-4" />, label: 'Total Paid',      value: `Rs ${data.financialSummary.totalPaid.toFixed(2)}`,      color: 'text-green-600' },
                  { icon: <AlertCircle className="w-4 h-4" />, label: 'Outstanding',    value: `Rs ${data.financialSummary.totalOutstanding.toFixed(2)}`, color: 'text-red-600' },
                  { icon: <Receipt className="w-4 h-4" />,     label: 'Total Purchases',value: data.financialSummary.purchaseCount,                      color: 'text-gray-900' },
                ].map(({ icon, label, value, color }) => (
                  <div key={label} className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">{icon}<span className="text-sm">{label}</span></div>
                    <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {[
                  { color: 'bg-green-500', label: `Paid: ${data.financialSummary.paidPurchases}` },
                  { color: 'bg-yellow-500', label: `Partial: ${data.financialSummary.partialPurchases}` },
                  { color: 'bg-red-500', label: `Unpaid: ${data.financialSummary.unpaidPurchases}` },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`w-3 h-3 ${color} rounded-full`} />
                    <span className="text-gray-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase records */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Records</h3>
              {data.sales?.length > 0 ? (
                <div className="space-y-4">
                  {data.sales.map((sale: any) => (
                    <div key={sale._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{sale.invoiceNumber}</p>
                          <p className="text-sm text-gray-600">{formatDate(sale.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentStatusColor(sale.paymentStatus)}`}>
                            {sale.paymentStatus}
                          </span>
                          <button
                            onClick={() => handleViewInvoice(sale)}
                            disabled={loadingInvoice === sale._id}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50 transition-colors"
                          >
                            {loadingInvoice === sale._id
                              ? <div className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                              : <><FileText className="w-3 h-3" /><span>Invoice</span><ExternalLink className="w-3 h-3" /></>
                            }
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        {sale.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.name} × {item.quantity}</span>
                            <span className="text-gray-900">Rs {item.total.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-3 space-y-1">
                        <div className="flex justify-between text-sm"><span className="text-gray-600">Total Amount:</span><span className="font-medium text-gray-900">Rs {sale.total.toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-600">Paid Amount:</span><span className="font-medium text-green-600">Rs {sale.paidAmount.toFixed(2)}</span></div>
                        {sale.total - sale.paidAmount > 0 && (
                          <div className="flex justify-between text-sm"><span className="text-gray-600">Outstanding:</span><span className="font-medium text-red-600">Rs {(sale.total - sale.paidAmount).toFixed(2)}</span></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No purchase history found</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {data.pagination?.pages > 1 && (
              <div className="p-4 border-t flex justify-center gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Previous</button>
                <span className="px-3 py-2 text-sm text-gray-600">Page {page} of {data.pagination.pages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page === data.pagination.pages} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CustomerPurchaseHistoryModal
