import React from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon, PackageIcon } from 'lucide-react'
import { Transaction } from './types'
import { invoicesAPI } from '../../services/api'
import { formatNepaliDateTime } from '../../utils/dateUtils'
import { useAuth } from '../../contexts/AuthContext'

interface Props {
  transaction: Transaction
}

const formatMethod = (m: string) =>
  m.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

const formatCurrency = (n: number) => `Rs ${n.toFixed(2)}`

const paymentStatusBadge = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-800'
    case 'partial': return 'bg-yellow-100 text-yellow-800'
    case 'scheduled': return 'bg-blue-100 text-blue-800'
    default: return 'bg-red-100 text-red-800'
  }
}

const TransactionDetails: React.FC<Props> = ({ transaction }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const handleViewInvoice = async () => {
    try {
      const invoiceType = transaction.type === 'sale' ? 'sale' : 'purchase'
      const response = await invoicesAPI.getAll(`relatedId=${transaction.dbId}&type=${invoiceType}`)
      if (response.invoices && response.invoices.length > 0) {
        navigate(`/invoices/${response.invoices[0]._id}`)
      } else {
        toast.error(`No invoice found for this ${transaction.type}`)
      }
    } catch (error: any) {
      toast.error(`Failed to find invoice for this ${transaction.type}`)
    }
  }

  const paidAmount = transaction.paidAmount || 0
  const scheduledAmount = transaction.scheduledAmount || 0
  const remaining = Math.max(0, transaction.total - paidAmount - scheduledAmount)
  const payments = transaction.payments || []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transaction Details */}
        <div className="bg-white p-3 rounded border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Transaction Details</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Transaction ID:</span>
              <span className="text-sm font-medium text-gray-900">{transaction.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Type:</span>
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                transaction.type === 'sale' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {transaction.type === 'sale' ? <ArrowUpIcon size={12} className="mr-1" /> : <ArrowDownIcon size={12} className="mr-1" />}
                <span className="capitalize">{transaction.type}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="text-sm font-medium text-gray-900 flex items-center">
                <CalendarIcon size={14} className="mr-1 text-gray-400" />
                {new Date(transaction.date).toLocaleDateString()} ({transaction.day})
              </span>
            </div>
            {transaction.counterpartName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {transaction.type === 'sale' ? 'Customer' : 'Supplier'}:
                </span>
                <span className="text-sm font-medium text-gray-900">{transaction.counterpartName}</span>
              </div>
            )}
            {transaction.reference && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Reference:</span>
                <span className="text-sm font-medium text-blue-600">{transaction.reference}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white p-3 rounded border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Items</h3>
          <div className="space-y-2">
            {transaction.items.map((item, idx) => (
              <div key={`${transaction.id}-item-${idx}`} className="flex items-start">
                <PackageIcon size={16} className="text-gray-400 mr-2 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="font-medium text-gray-900">{item.quantity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Unit Price:</span>
                      <span className="font-medium text-gray-900">Rs {item.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t">
                      <span className="text-gray-700 font-medium">Total:</span>
                      <span className="font-bold text-gray-900">Rs {item.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {transaction.items.length === 0 && (
              <p className="text-sm text-gray-500">No items recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-white p-3 rounded border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Payment Summary</h3>
          {transaction.paymentStatus && (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${paymentStatusBadge(transaction.paymentStatus)}`}>
              {transaction.paymentStatus}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-gray-500 text-xs">Total</p>
            <p className="font-semibold text-gray-900">{formatCurrency(transaction.total)}</p>
          </div>
          <div className="bg-green-50 rounded p-2">
            <p className="text-gray-500 text-xs">Paid</p>
            <p className="font-semibold text-green-700">{formatCurrency(paidAmount)}</p>
          </div>
          {scheduledAmount > 0 && (
            <div className="bg-blue-50 rounded p-2">
              <p className="text-gray-500 text-xs">Scheduled</p>
              <p className="font-semibold text-blue-700">{formatCurrency(scheduledAmount)}</p>
            </div>
          )}
          <div className={`rounded p-2 ${remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className="text-gray-500 text-xs">Remaining</p>
            <p className={`font-semibold ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white p-3 rounded border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Payment History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-gray-500 uppercase">Date (NPT)</th>
                  <th className="px-3 py-2 text-right text-gray-500 uppercase">Amount</th>
                  <th className="px-3 py-2 text-left text-gray-500 uppercase">Method</th>
                  <th className="px-3 py-2 text-left text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {payments.map((p, idx) => (
                  <tr key={idx} className={p.status === 'scheduled' ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-900">
                      {formatNepaliDateTime(p.date, {
                        timeZone: 'Asia/Kathmandu',
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true,
                      })}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{formatMethod(p.method)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {p.status === 'completed' ? 'Completed' : 'Scheduled'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {transaction.reference && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Linked document:</span>{' '}
            {transaction.type === 'sale' ? 'Invoice' : 'Purchase Order'}{' '}
            <span className="font-medium">{transaction.reference}</span>
          </p>
          {isOwner && (
            <button
              onClick={handleViewInvoice}
              className="bg-teal-500 hover:bg-teal-600 text-white py-1 px-3 rounded text-sm ml-4 shrink-0"
            >
              View Invoice
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TransactionDetails

