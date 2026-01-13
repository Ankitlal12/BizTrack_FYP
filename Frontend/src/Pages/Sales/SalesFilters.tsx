import React, { useState } from 'react'
import { SearchIcon, FilterIcon, XIcon } from 'lucide-react'

interface SalesFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterStatus: string
  onFilterStatusChange: (value: string) => void
  paymentStatusFilter: string
  onPaymentStatusChange: (value: string) => void
  paymentMethodFilter: string
  onPaymentMethodChange: (value: string) => void
  customerFilter: string
  onCustomerChange: (value: string) => void
  customers: string[]
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  totalMin: string
  onTotalMinChange: (value: string) => void
  totalMax: string
  onTotalMaxChange: (value: string) => void
  subtotalMin: string
  onSubtotalMinChange: (value: string) => void
  subtotalMax: string
  onSubtotalMaxChange: (value: string) => void
  taxMin: string
  onTaxMinChange: (value: string) => void
  taxMax: string
  onTaxMaxChange: (value: string) => void
  quantityMin: string
  onQuantityMinChange: (value: string) => void
  quantityMax: string
  onQuantityMaxChange: (value: string) => void
  onClearFilters: () => void
}

const SalesFilters: React.FC<SalesFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  paymentStatusFilter,
  onPaymentStatusChange,
  paymentMethodFilter,
  onPaymentMethodChange,
  customerFilter,
  onCustomerChange,
  customers,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  totalMin,
  onTotalMinChange,
  totalMax,
  onTotalMaxChange,
  subtotalMin,
  onSubtotalMinChange,
  subtotalMax,
  onSubtotalMaxChange,
  taxMin,
  onTaxMinChange,
  taxMax,
  onTaxMaxChange,
  quantityMin,
  onQuantityMinChange,
  quantityMax,
  onQuantityMaxChange,
  onClearFilters,
}) => {
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  const toggleMoreFilters = () => {
    setShowMoreFilters((prev) => !prev)
  }

  const hasActiveFilters =
    filterStatus !== 'all' ||
    paymentStatusFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    customerFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    totalMin !== '' ||
    totalMax !== '' ||
    subtotalMin !== '' ||
    subtotalMax !== '' ||
    taxMin !== '' ||
    taxMax !== '' ||
    quantityMin !== '' ||
    quantityMax !== ''

  return (
    <div className="p-5 border-b">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by invoice number or customer..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select
          className="border border-gray-300 rounded-lg py-2 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={filterStatus}
          onChange={(e) => onFilterStatusChange(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Payment Status Filter */}
        <select
          className="border border-gray-300 rounded-lg py-2 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={paymentStatusFilter}
          onChange={(e) => onPaymentStatusChange(e.target.value)}
        >
          <option value="all">All Payment Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>

        {/* Filters Button */}
        <button
          onClick={toggleMoreFilters}
          className={`border border-gray-300 text-gray-700 py-2 px-4 rounded-lg flex items-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
            hasActiveFilters ? 'bg-teal-50 border-teal-300' : 'bg-white'
          }`}
        >
          <FilterIcon size={18} className="mr-2" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="ml-2 bg-teal-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              !
            </span>
          )}
        </button>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-gray-600 hover:text-red-600 py-2 px-3 flex items-center focus:outline-none"
            title="Clear all filters"
          >
            <XIcon size={18} />
          </button>
        )}
      </div>

      {/* Expanded Filters Panel */}
      {showMoreFilters && (
        <div className="mt-4 p-5 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Advanced Filters</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Customer</label>
              <select
                className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                value={customerFilter}
                onChange={(e) => onCustomerChange(e.target.value)}
              >
                <option value="all">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer} value={customer}>
                    {customer}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Payment Method</label>
              <select
                className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                value={paymentMethodFilter}
                onChange={(e) => onPaymentMethodChange(e.target.value)}
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Date From</label>
              <input
                type="date"
                className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Date To</label>
              <input
                type="date"
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

            {/* Subtotal Range */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Subtotal ($)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  step="0.01"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={subtotalMin}
                  onChange={(e) => onSubtotalMinChange(e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  step="0.01"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={subtotalMax}
                  onChange={(e) => onSubtotalMaxChange(e.target.value)}
                />
              </div>
            </div>

            {/* Tax Range */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Tax ($)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  step="0.01"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={taxMin}
                  onChange={(e) => onTaxMinChange(e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  step="0.01"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={taxMax}
                  onChange={(e) => onTaxMaxChange(e.target.value)}
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
        </div>
      )}
    </div>
  )
}

export default SalesFilters
