import React, { useState } from 'react'
import { SearchIcon, FilterIcon, XIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import DatePresets from '../../components/DatePresets'

interface PurchaseFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterStatus: string
  onFilterStatusChange: (value: string) => void
  paymentStatusFilter: string
  onPaymentStatusChange: (value: string) => void
  paymentMethodFilter: string
  onPaymentMethodChange: (value: string) => void
  supplierFilter: string
  onSupplierChange: (value: string) => void
  suppliers: string[]
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  totalMin: string
  onTotalMinChange: (value: string) => void
  totalMax: string
  onTotalMaxChange: (value: string) => void
  quantityMin: string
  onQuantityMinChange: (value: string) => void
  quantityMax: string
  onQuantityMaxChange: (value: string) => void
  onClearFilters: () => void
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSortFieldChange: (value: string) => void
  onSortDirectionChange: (value: 'asc' | 'desc') => void
}

const PurchaseFilters: React.FC<PurchaseFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  paymentStatusFilter,
  onPaymentStatusChange,
  paymentMethodFilter,
  onPaymentMethodChange,
  supplierFilter,
  onSupplierChange,
  suppliers,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  totalMin,
  onTotalMinChange,
  totalMax,
  onTotalMaxChange,
  quantityMin,
  onQuantityMinChange,
  quantityMax,
  onQuantityMaxChange,
  onClearFilters,
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
}) => {
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  const toggleMoreFilters = () => {
    setShowMoreFilters((prev) => !prev)
  }

  const hasActiveFilters =
    filterStatus !== 'all' ||
    paymentStatusFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    supplierFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    totalMin !== '' ||
    totalMax !== '' ||
    quantityMin !== '' ||
    quantityMax !== ''

  return (
    <div className="p-5 border-b">
      <div className="flex flex-wrap gap-4">
        {/* Search Bar */}
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by PO number or supplier..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select
          title="Filter purchases by status"
          className="w-full sm:w-auto border border-gray-300 rounded-lg py-2 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 sm:min-w-[140px]"
          value={filterStatus}
          onChange={(e) => onFilterStatusChange(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Payment Status Filter */}
        <select
          title="Filter purchases by payment status"
          className="w-full sm:w-auto border border-gray-300 rounded-lg py-2 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 sm:min-w-[160px]"
          value={paymentStatusFilter}
          onChange={(e) => onPaymentStatusChange(e.target.value)}
        >
          <option value="all">All Payment Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            title="Sort purchases by"
            className="flex-1 sm:flex-none border border-gray-300 rounded-lg py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            value={sortField}
            onChange={(e) => onSortFieldChange(e.target.value)}
          >
            <option value="date">Sort by Date</option>
            <option value="total">Sort by Total</option>
            <option value="supplierName">Sort by Supplier</option>
            <option value="purchaseNumber">Sort by PO Number</option>
          </select>
          <button
            onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
            className={`border border-gray-300 rounded-lg p-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              sortDirection === 'desc' ? 'bg-teal-50 border-teal-300' : 'bg-white'
            }`}
            title={sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}
          >
            {sortDirection === 'desc' ? (
              <ArrowDownIcon size={18} className="text-teal-600" />
            ) : (
              <ArrowUpIcon size={18} className="text-gray-600" />
            )}
          </button>
        </div>

        {/* Filters + Clear */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <button
            onClick={toggleMoreFilters}
            className={`flex-1 sm:flex-none border border-gray-300 text-gray-700 py-2 px-4 rounded-lg flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              hasActiveFilters ? 'bg-teal-50 border-teal-300' : 'bg-white'
            }`}
          >
            <FilterIcon size={18} className="mr-2" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="ml-2 bg-teal-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">!</span>
            )}
          </button>
          {hasActiveFilters && (
            <button onClick={onClearFilters} className="text-gray-600 hover:text-red-600 py-2 px-3 flex items-center focus:outline-none" title="Clear all filters">
              <XIcon size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filters Panel */}
      {showMoreFilters && (
        <div className="mt-4 p-5 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Advanced Filters</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Supplier Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Supplier</label>
              <select
                title="Filter purchases by supplier"
                className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                value={supplierFilter}
                onChange={(e) => onSupplierChange(e.target.value)}
              >
                <option value="all">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Payment Method</label>
              <select
                title="Filter purchases by payment method"
                className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                value={paymentMethodFilter}
                onChange={(e) => onPaymentMethodChange(e.target.value)}
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit">Credit</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Date From</label>
              <input
                type="date"
                title="Purchase date from"
                className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Date To</label>
              <input
                type="date"
                title="Purchase date to"
                className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
              />
            </div>

            {/* Total Range */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Total ($)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  step="0.01"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={totalMin}
                  onChange={(e) => onTotalMinChange(e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  step="0.01"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={totalMax}
                  onChange={(e) => onTotalMaxChange(e.target.value)}
                />
              </div>
            </div>

            {/* Quantity Range (Total Items Quantity) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Total Quantity</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={quantityMin}
                  onChange={(e) => onQuantityMinChange(e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={quantityMax}
                  onChange={(e) => onQuantityMaxChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Date Presets */}
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-600 block mb-2">Quick Date Ranges</label>
            <DatePresets onSelect={(from, to) => { onDateFromChange(from); onDateToChange(to) }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default PurchaseFilters
