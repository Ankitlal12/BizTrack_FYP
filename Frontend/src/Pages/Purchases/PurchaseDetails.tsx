import React from 'react'
import { CalendarIcon, DollarSignIcon } from 'lucide-react'
import { Purchase } from './types'
import { getStatusBadgeClass, getPaymentStatusBadgeClass, getPurchaseDate, getPurchaseKey } from './utils'

interface PurchaseDetailsProps {
  purchase: Purchase
  editingPaymentStatus: string | null
  onPaymentStatusChange: (purchaseId: string, newStatus: string) => void
  onEditPaymentStatus: (purchaseKey: string | null) => void
}

const PurchaseDetails: React.FC<PurchaseDetailsProps> = ({
  purchase,
  editingPaymentStatus,
  onPaymentStatusChange,
  onEditPaymentStatus,
}) => {
  const purchaseKey = getPurchaseKey(purchase)
  const paymentStatusValue = purchase.paymentStatus || 'unpaid'
  const isEditingInDetails = editingPaymentStatus === `detail-${purchaseKey}`

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
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-gray-500">Total Amount:</div>
                <div className="text-sm font-medium flex items-center">
                  <DollarSignIcon size={14} className="mr-1 text-gray-400" />
                  ${purchase.total.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Payment Status:</div>
                <div className="text-sm">
                  {isEditingInDetails ? (
                    <select
                      className="border border-gray-300 rounded text-sm py-1 px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      value={paymentStatusValue}
                      onChange={(e) =>
                        onPaymentStatusChange(purchaseKey, e.target.value)
                      }
                      onBlur={() => onEditPaymentStatus('')}
                      autoFocus
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partially Paid</option>
                      <option value="paid">Paid</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer ${getPaymentStatusBadgeClass(paymentStatusValue)}`}
                      onClick={() => onEditPaymentStatus(`detail-${purchaseKey}`)}
                    >
                      {paymentStatusValue.charAt(0).toUpperCase() +
                        paymentStatusValue.slice(1)}
                    </span>
                  )}
                </div>
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

