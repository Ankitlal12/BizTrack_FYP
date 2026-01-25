import React, { Fragment } from 'react'
import { Sale } from '../Sales/types'
import { getStatusBadgeClass, getPaymentStatusBadgeClass, getSaleKey } from '../Sales/utils'
import SalesDetails from './SalesDetails'

interface SalesTableRowProps {
  sale: Sale
  expandedSale: string | null
  onToggleExpand: (id: string | null) => void
  onRecordPayment?: (sale: Sale) => void
  onViewInvoice?: (saleId: string) => void
}

const SalesTableRow: React.FC<SalesTableRowProps> = ({
  sale,
  expandedSale,
  onToggleExpand,
  onRecordPayment,
  onViewInvoice,
}) => {
  const saleKey = getSaleKey(sale)
  const isExpanded = expandedSale === saleKey

  return (
    <Fragment>
      <tr className="hover:bg-gray-50">
        <td className="py-4 px-4 whitespace-nowrap">
          <div className="font-medium text-blue-600">{sale.id}</div>
        </td>
        <td className="py-4 px-4 whitespace-nowrap">
          <div className="font-medium text-gray-900">{sale.customer.name}</div>
        </td>
        <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">
          {new Date(sale.date).toLocaleDateString()}
        </td>
        <td className="py-4 px-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">
            Rs {sale.total.toFixed(2)}
          </div>
        </td>
        <td className="py-4 px-4 whitespace-nowrap">
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(sale.status)}`}
          >
            {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
          </span>
        </td>
        <td className="py-4 px-4 whitespace-nowrap">
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusBadgeClass(sale.paymentStatus)}`}
          >
            {sale.paymentStatus.charAt(0).toUpperCase() +
              sale.paymentStatus.slice(1)}
          </span>
        </td>
        <td className="py-4 px-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={() => onToggleExpand(saleKey)}
            className="text-teal-600 hover:text-teal-900"
          >
            {isExpanded ? 'Hide Details' : 'View Details'}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <SalesDetails 
          sale={sale} 
          onRecordPayment={onRecordPayment ? () => onRecordPayment(sale) : undefined}
          onViewInvoice={onViewInvoice}
        />
      )}
    </Fragment>
  )
}

export default SalesTableRow

