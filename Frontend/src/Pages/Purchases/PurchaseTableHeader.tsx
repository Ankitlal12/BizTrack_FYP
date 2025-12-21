import React from 'react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

interface PurchaseTableHeaderProps {
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
}

const PurchaseTableHeader: React.FC<PurchaseTableHeaderProps> = ({
  sortField,
  sortDirection,
  onSort,
}) => {
  const SortableHeader: React.FC<{ field: string; label: string }> = ({
    field,
    label,
  }) => (
    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <button
        className="flex items-center space-x-1"
        onClick={() => onSort(field)}
      >
        <span>{label}</span>
        {sortField === field &&
          (sortDirection === 'asc' ? (
            <ChevronUpIcon size={16} />
          ) : (
            <ChevronDownIcon size={16} />
          ))}
      </button>
    </th>
  )

  return (
    <thead>
      <tr className="bg-gray-50">
        <SortableHeader field="id" label="PO Number" />
        <SortableHeader field="supplier" label="Supplier" />
        <SortableHeader field="date" label="Date" />
        <SortableHeader field="total" label="Total" />
        <SortableHeader field="status" label="Status" />
        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Payment
        </th>
        <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
  )
}

export default PurchaseTableHeader


