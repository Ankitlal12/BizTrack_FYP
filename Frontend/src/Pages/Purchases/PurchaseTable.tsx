import React from 'react'
import { Purchase } from './types'
import PurchaseTableHeader from './PurchaseTableHeader'
import PurchaseTableRow from './PurchaseTableRow'

interface PurchaseTableProps {
  purchases: Purchase[]
  sortField: string
  sortDirection: 'asc' | 'desc'
  expandedPurchase: string | null
  editingPaymentStatus: string | null
  onSort: (field: string) => void
  onToggleExpand: (id: string | null) => void
  onPaymentStatusChange: (purchaseId: string, newStatus: string) => void
  onEditPaymentStatus: (purchaseKey: string | null) => void
  onRecordPayment?: (purchase: Purchase) => void
}

const PurchaseTable: React.FC<PurchaseTableProps> = ({
  purchases,
  sortField,
  sortDirection,
  expandedPurchase,
  editingPaymentStatus,
  onSort,
  onToggleExpand,
  onPaymentStatusChange,
  onEditPaymentStatus,
  onRecordPayment,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <PurchaseTableHeader
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
        />
        <tbody className="divide-y divide-gray-200">
          {purchases.map((purchase) => (
            <PurchaseTableRow
              key={purchase._id || purchase.purchaseNumber}
              purchase={purchase}
              expandedPurchase={expandedPurchase}
              editingPaymentStatus={editingPaymentStatus}
              onToggleExpand={onToggleExpand}
              onPaymentStatusChange={onPaymentStatusChange}
              onEditPaymentStatus={onEditPaymentStatus}
              onRecordPayment={onRecordPayment}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PurchaseTable


