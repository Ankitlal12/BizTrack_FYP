import React, { useState } from 'react'
import { SearchIcon, FilterIcon, RefreshCwIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { TransactionType } from './types'

interface Props {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterType: TransactionType | 'all'
  onFilterChange: (value: TransactionType | 'all') => void
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  totalMin: string
  onTotalMinChange: (value: string) => void
  totalMax: string
  onTotalMaxChange: (value: string) => void
  onRefresh: () => void
  onClearFilters: () => void
  isRefreshing?: boolean
}

const TransactionFilters: React.FC<Props> = ({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  totalMin,
  onTotalMinChange,
  totalMax,
  onTotalMaxChange,
  onRefresh,
  onClearFilters,
  isRefreshing,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  return (
    <div className="p-5 border-b bg-white rounded-t-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by ID, reference, customer or supplier..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <select
            className="border border-gray-300 rounded-lg py-2 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={filterType}
            onChange={(e) => onFilterChange(e.target.value as TransactionType | 'all')}
          >
            <option value="all">All Transactions</option>
            <option value="sale">Sales Only</option>
            <option value="purchase">Purchases Only</option>
          </select>
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg flex items-center hover:bg-gray-50"
          >
            <FilterIcon size={18} className="mr-2" />
            <span>More Filters</span>
            {showAdvancedFilters ? (
              <ChevronUpIcon size={16} className="ml-1" />
            ) : (
              <ChevronDownIcon size={16} className="ml-1" />
            )}
          </button>
          <button
            onClick={onClearFilters}
            className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
          >
            Clear
          </button>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white py-2 px-4 rounded-lg flex items-center"
          >
            <RefreshCwIcon
              size={18}
              className={`mr-1 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Amount (Rs)
              </label>
              <input
                type="number"
                placeholder="0"
                value={totalMin}
                onChange={(e) => onTotalMinChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Amount (Rs)
              </label>
              <input
                type="number"
                placeholder="999999"
                value={totalMax}
                onChange={(e) => onTotalMaxChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionFilters

