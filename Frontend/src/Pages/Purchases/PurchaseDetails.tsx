import React from 'react'
import { CalendarIcon, DollarSignIcon } from 'lucide-react'
import { Purchase } from './types'
import { getStatusBadgeClass, getPaymentStatusBadgeClass, getPurchaseDate, getPurchaseKey } from './utils'

interface PurchaseDetailsProps {
  purchase: Purchase
  editingPaymentStatus?: string | null
  onPaymentStatusChange?: (purchaseId: string, newStatus: string) => void
  onEditPaymentStatus?: (purchaseKey: string | null) => void
  onRecordPayment?: () => void
}

const PurchaseDetails: React.FC<PurchaseDetailsProps> = ({
  purchase,
  editingPaymentStatus,
  onPaymentStatusChange,
  onEditPaymentStatus,
  onRecordPayment,
}) => {
  const purchaseKey = getPurchaseKey(purchase)
  const paymentStatusValue = purchase.paymentStatus || 'unpaid'
  const paidAmount = purchase.paidAmount || 0
  const remainingBalance = purchase.total - paidAmount

  return (
    <tr>
      <td colSpan={7} className="bg-gray-50 p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Order Information
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-gray-500">Purchase Order:</div>
                <div className="text-sm font-medium">{purchase.purchaseNumber}</div>
                <div className="text-sm text-gray-500">Supplier:</div>
                <div className="text-sm font-medium">{purchase.supplierName}</div>
                <div className="text-sm text-gray-500">Order Date:</div>
                <div className="text-sm font-medium flex items-center">
                  <CalendarIcon size={14} className="mr-1 text-gray-400" />
                  {getPurchaseDate(purchase)}
                </div>
                <div className="text-sm text-gray-500">Status:</div>
                <div className="text-sm">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(purchase.status)}`}
                  >
                    {purchase.status.charAt(0).toUpperCase() +
                      purchase.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white p-3 rounded border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Payment Information
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 text-sm">
                  <p className="text-gray-500">Total Amount:</p>
                  <p className="text-gray-900 font-medium">${purchase.total.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-2 text-sm">
                  <p className="text-gray-500">Paid Amount:</p>
                  <p className="text-gray-900 font-medium">${paidAmount.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-2 text-sm">
                  <p className="text-gray-500">Remaining:</p>
                  <p className={`font-medium ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${remainingBalance.toFixed(2)}
                  </p>
                </div>
                <div className="grid grid-cols-2 text-sm">
                  <p className="text-gray-500">Status:</p>
                  <p className="font-medium">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getPaymentStatusBadgeClass(paymentStatusValue)}`}
                    >
                      {paymentStatusValue.charAt(0).toUpperCase() +
                        paymentStatusValue.slice(1)}
                    </span>
                  </p>
                </div>
                {onRecordPayment && remainingBalance > 0 && (
                  <div className="pt-2 mt-2 border-t">
                    <button
                      onClick={onRecordPayment}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2 px-3 rounded text-sm flex items-center justify-center"
                    >
                      <DollarSignIcon size={16} className="mr-1" />
                      Record Payment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-700">Purchase Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchase.items.map((item) => {
                  const unitCost =
                    typeof item.cost === 'number'
                      ? item.cost
                      : (item as any).price || 0
                  return (
                    <tr
                      key={(item as any)._id || item.id || item.name}
                      className="hover:bg-gray-100"
                    >
                      <td className="py-2 px-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-sm text-gray-500">
                        {item.category || 'Uncategorized'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {item.quantity}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        ${unitCost.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                        ${item.total.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td
                    colSpan={4}
                    className="py-2 px-3 text-right text-sm font-medium text-gray-700"
                  >
                    Total
                  </td>
                  <td className="py-2 px-3 text-right text-sm font-medium text-gray-900">
                    ${purchase.total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Payment History */}
          {purchase.payments && purchase.payments.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Payment History</h3>
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {purchase.payments.map((payment, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-xs text-gray-900">
                          {new Date(payment.date).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">
                          ${payment.amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-500">
                          {payment.method
                            .split('_')
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-500">
                          {payment.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {purchase.notes && (
            <div className="mt-2">
              <h4 className="text-xs font-medium text-gray-700">Notes:</h4>
              <p className="text-sm text-gray-600">{purchase.notes}</p>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <button className="bg-white border border-gray-300 text-gray-700 py-1 px-3 rounded text-sm hover:bg-gray-50">
              Print
            </button>
            <button className="bg-white border border-gray-300 text-gray-700 py-1 px-3 rounded text-sm hover:bg-gray-50">
              Export
            </button>
            {purchase.status !== 'received' &&
              purchase.status !== 'cancelled' && (
                <button className="bg-teal-500 hover:bg-teal-600 text-white py-1 px-3 rounded text-sm">
                  Mark as Received
                </button>
              )}
          </div>
        </div>
      </td>
    </tr>
  )
}

export default PurchaseDetails

