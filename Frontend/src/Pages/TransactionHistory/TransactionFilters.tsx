import React, { useState } from 'react'
import { SearchIcon, FilterIcon, RefreshCwIcon, XIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
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
  sortField: string
  onSortFieldChange: (value: string) => void
  sortDirection: 'asc' | 'desc'
  onSortDirectionChange: (value: 'asc' | 'desc') => void
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
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
  onRefresh,
  onClearFilters,
  isRefreshing,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const hasActiveFilters =
    filterType !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    totalMin !== '' ||
    totalMax !== ''

  return (
    <div className="p-5 border-b bg-white rounded-t-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search Bar */}
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

        {/* Type Filter */}
        <select
          className="border border-gray-300 rounded-lg py-2 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={filterType}
          onChange={(e) => onFilterChange(e.target.value as TransactionType | 'all')}
        >
          <option value="all">All Transactions</option>
          <option value="sale">Sales Only</option>
          <option value="purchase">Purchases Only</option>
        </select>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <select
            className="border border-gray-300 rounded-lg py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            value={sortField}
            onChange={(e) => onSortFieldChange(e.target.value)}
          >
            <option value="date">Sort by Date</option>
            <option value="total">Sort by Total</option>
            <option value="type">Sort by Type</option>
            <option value="reference">Sort by Reference</option>
          </select>
          <button
            onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
            className={`border border-gray-300 rounded-lg p-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              sortDirection === 'desc' ? 'bg-teal-50 border-teal-300' : 'bg-white'
            }`}
            title={sortDirection === 'desc' ? 'Newest first (click for oldest first)' : 'Oldest first (click for newest first)'}
          >
            {sortDirection === 'desc' ? (
              <ArrowDownIcon size={18} className="text-teal-600" />
            ) : (
              <ArrowUpIcon size={18} className="text-gray-600" />
            )}
          </button>
        </div>

        {/* Filters Button */}
        <button 
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
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

        {/* Refresh Button */}
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

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="mt-4 p-5 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Advanced Filters</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>

            {/* Amount Range */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Amount (Rs)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  step="0.01"
                  value={totalMin}
                  onChange={(e) => onTotalMinChange(e.target.value)}
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  step="0.01"
                  value={totalMax}
                  onChange={(e) => onTotalMaxChange(e.target.value)}
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionFilters

