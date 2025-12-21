import React, { Fragment } from 'react'
import { Purchase } from './types'
import { getStatusBadgeClass, getPaymentStatusBadgeClass, getPurchaseDate, getPurchaseKey } from './utils'
import PurchaseDetails from './PurchaseDetails'

interface PurchaseTableRowProps {
  purchase: Purchase
  expandedPurchase: string | null
  editingPaymentStatus: string | null
  onToggleExpand: (id: string | null) => void
  onPaymentStatusChange: (purchaseId: string, newStatus: string) => void
  onEditPaymentStatus: (purchaseKey: string | null) => void
}

const PurchaseTableRow: React.FC<PurchaseTableRowProps> = ({
  purchase,
  expandedPurchase,
  editingPaymentStatus,
  onToggleExpand,
  onPaymentStatusChange,
  onEditPaymentStatus,
}) => {
  const purchaseKey = getPurchaseKey(purchase)
  const paymentStatusValue = purchase.paymentStatus || 'unpaid'
  const isExpanded = expandedPurchase === purchaseKey
  const isEditing = editingPaymentStatus === purchaseKey

  return (
    <Fragment>
      <tr className="hover:bg-gray-50">
        <td className="py-4 px-4 whitespace-nowrap">
          <div className="font-medium text-blue-600">{purchase.purchaseNumber}</div>
        </td>
        <td className="py-4 px-4 whitespace-nowrap">
          <div className="font-medium text-gray-900">{purchase.supplierName}</div>
        </td>
        <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">
          {getPurchaseDate(purchase)}
        </td>
        <td className="py-4 px-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">
            ${purchase.total.toFixed(2)}
          </div>
        </td>
        <td className="py-4 px-4 whitespace-nowrap">
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(purchase.status)}`}
          >
            {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
          </span>
        </td>
        <td className="py-4 px-4 whitespace-nowrap">
          {isEditing ? (
            <select
              className="border border-gray-300 rounded text-sm py-1 px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
              value={paymentStatusValue}
              onChange={(e) => onPaymentStatusChange(purchaseKey, e.target.value)}
              onBlur={() => onEditPaymentStatus(null)}
              autoFocus
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          ) : (
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${getPaymentStatusBadgeClass(paymentStatusValue)}`}
              onClick={() => onEditPaymentStatus(purchaseKey)}
            >
              {paymentStatusValue.charAt(0).toUpperCase() +
                paymentStatusValue.slice(1)}
            </span>
          )}
        </td>
        <td className="py-4 px-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={() => onToggleExpand(purchaseKey)}
            className="text-teal-600 hover:text-teal-900"
          >
            {isExpanded ? 'Hide Details' : 'View Details'}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <PurchaseDetails
          purchase={purchase}
          editingPaymentStatus={editingPaymentStatus}
          onPaymentStatusChange={onPaymentStatusChange}
          onEditPaymentStatus={onEditPaymentStatus}
        />
      )}
    </Fragment>
  )
}

export default PurchaseTableRow


