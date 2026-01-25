import React from 'react'
import { Sale } from '../Sales/types'
import SalesTableHeader from '../Sales/SalesTableHeader'
import SalesTableRow from '../Sales/SalesTableRow'

interface SalesTableProps {
  sales: Sale[]
  sortField: string
  sortDirection: 'asc' | 'desc'
  expandedSale: string | null
  onSort: (field: string) => void
  onToggleExpand: (id: string | null) => void
  onRecordPayment?: (sale: Sale) => void
  onViewInvoice?: (saleId: string) => void
}

const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  sortField,
  sortDirection,
  expandedSale,
  onSort,
  onToggleExpand,
  onRecordPayment,
  onViewInvoice,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <SalesTableHeader
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
        />
        <tbody className="divide-y divide-gray-200">
          {sales.map((sale) => (
            <SalesTableRow
              key={sale.id || sale._id}
              sale={sale}
              expandedSale={expandedSale}
              onToggleExpand={onToggleExpand}
              onRecordPayment={onRecordPayment}
              onViewInvoice={onViewInvoice}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SalesTable

