import React from 'react'
import { UserIcon, DollarSignIcon, ClockIcon, FileTextIcon } from 'lucide-react'
import { Sale } from '../Sales/types'
import { getStatusBadgeClass, getPaymentStatusBadgeClass, formatPaymentMethod } from '../Sales/utils'
import { formatNepaliDateTime } from '../../utils/dateUtils'

interface SalesDetailsProps {
  sale: Sale
  onRecordPayment?: () => void
  onViewInvoice?: (saleId: string) => void
}

const SalesDetails: React.FC<SalesDetailsProps> = ({ sale, onRecordPayment, onViewInvoice }) => {
  const paidAmount = sale.paidAmount || 0
  const remainingBalance = sale.total - paidAmount
  return (
    <tr>
      <td colSpan={7} className="bg-gray-50 p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Customer Information
              </h3>
              <div className="flex items-start">
                <div className="bg-gray-100 rounded-full p-2 mr-3">
                  <UserIcon size={20} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {sale.customer.name}
                  </p>
                  {sale.customer.email && (
                    <p className="text-xs text-gray-500">{sale.customer.email}</p>
                  )}
                  {sale.customer.phone && (
                    <p className="text-xs text-gray-500">{sale.customer.phone}</p>
                  )}
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
                  <p className="text-gray-900 font-medium">Rs {sale.total.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-2 text-sm">
                  <p className="text-gray-500">Paid Amount:</p>
                  <p className="text-gray-900 font-medium">Rs {paidAmount.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-2 text-sm">
                  <p className="text-gray-500">Remaining:</p>
                  <p className={`font-medium ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Rs {remainingBalance.toFixed(2)}
                  </p>
                </div>
                <div className="grid grid-cols-2 text-sm">
                  <p className="text-gray-500">Status:</p>
                  <p className="font-medium">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getPaymentStatusBadgeClass(sale.paymentStatus)}`}
                    >
                      {sale.paymentStatus.charAt(0).toUpperCase() +
                        sale.paymentStatus.slice(1)}
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
          <h3 className="text-sm font-medium text-gray-700">Sale Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
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
                {sale.items.map((item, index) => (
                  <tr key={item._id || item.id || index} className="hover:bg-gray-100">
                    <td className="py-2 px-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-sm text-gray-500 text-right">
                      Rs {item.price.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                      Rs {item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td
                    colSpan={3}
                    className="py-2 px-3 text-right text-xs font-medium text-gray-700"
                  >
                    Subtotal
                  </td>
                  <td className="py-2 px-3 text-right text-xs text-gray-900">
                    Rs {sale.subtotal.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td
                    colSpan={3}
                    className="py-2 px-3 text-right text-xs font-medium text-gray-700"
                  >
                    Tax
                  </td>
                  <td className="py-2 px-3 text-right text-xs text-gray-900">
                    Rs {sale.tax.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td
                    colSpan={3}
                    className="py-2 px-3 text-right text-sm font-medium text-gray-700"
                  >
                    Total
                  </td>
                  <td className="py-2 px-3 text-right text-sm font-bold text-gray-900">
                    Rs {sale.total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Payment History */}
          {sale.payments && sale.payments.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Payment History</h3>
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date & Time (NPT)
                      </th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sale.payments.map((payment, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-xs text-gray-900">
                          {formatNepaliDateTime(payment.date, {
                            timeZone: 'Asia/Kathmandu',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-900 text-right font-medium">
                          Rs {payment.amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-500">
                          {formatPaymentMethod(payment.method)}
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

          {sale.notes && (
            <div className="mt-2">
              <h4 className="text-xs font-medium text-gray-700">Notes:</h4>
              <p className="text-sm text-gray-600">{sale.notes}</p>
            </div>
          )}

          {/* User Information */}
          {sale.createdBy && (
            <div className="mt-4 bg-blue-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <UserIcon size={16} className="mr-1" />
                Transaction Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-blue-600">Processed by:</span>
                  <span className="ml-2 font-medium text-blue-900">{sale.createdBy.name}</span>
                </div>
                <div>
                  <span className="text-blue-600">Role:</span>
                  <span className="ml-2 font-medium text-blue-900 capitalize">{sale.createdBy.role}</span>
                </div>
                <div className="flex items-center">
                  <ClockIcon size={14} className="text-blue-600 mr-1" />
                  <span className="text-blue-600">Date & Time:</span>
                  <div className="ml-2">
                    <span className="font-medium text-blue-900">{formatNepaliDateTime(sale.date)}</span>
                    <div className="text-xs text-blue-600 mt-1">Nepal Time (NPT)</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <button 
              onClick={() => onViewInvoice && onViewInvoice(sale._id || sale.id)}
              className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm flex items-center"
            >
              <FileTextIcon size={14} className="mr-1" />
              View Invoice
            </button>
            <button className="bg-white border border-gray-300 text-gray-700 py-1 px-3 rounded text-sm hover:bg-gray-50">
              Print Invoice
            </button>
            <button className="bg-white border border-gray-300 text-gray-700 py-1 px-3 rounded text-sm hover:bg-gray-50">
              Email to Customer
            </button>
            {sale.status !== 'completed' && (
              <button className="bg-teal-500 hover:bg-teal-600 text-white py-1 px-3 rounded text-sm">
                {sale.status === 'pending' ? 'Process Sale' : 'Complete Sale'}
              </button>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

export default SalesDetails

