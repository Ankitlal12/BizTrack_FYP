import React from 'react'
import { UserIcon } from 'lucide-react'
import { Sale } from '../Sales/types'
import { getStatusBadgeClass, getPaymentStatusBadgeClass, formatPaymentMethod } from '../Sales/utils'

interface SalesDetailsProps {
  sale: Sale
}

const SalesDetails: React.FC<SalesDetailsProps> = ({ sale }) => {
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
              <div>
                <div className="grid grid-cols-2 text-sm">
                  <p className="text-gray-500">Method:</p>
                  <p className="text-gray-900 font-medium">
                    {formatPaymentMethod(sale.paymentMethod)}
                  </p>
                </div>
                <div className="grid grid-cols-2 text-sm mt-1">
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
                <div className="grid grid-cols-2 text-sm mt-1">
                  <p className="text-gray-500">Date:</p>
                  <p className="text-gray-900">
                    {new Date(sale.date).toLocaleDateString()}
                  </p>
                </div>
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
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                      ${item.total.toFixed(2)}
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
                    ${sale.subtotal.toFixed(2)}
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
                    ${sale.tax.toFixed(2)}
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
                    ${sale.total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {sale.notes && (
            <div className="mt-2">
              <h4 className="text-xs font-medium text-gray-700">Notes:</h4>
              <p className="text-sm text-gray-600">{sale.notes}</p>
            </div>
          )}
          <div className="flex justify-end space-x-2">
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

