import React from 'react'
import { SearchIcon, FilterIcon, RefreshCwIcon } from 'lucide-react'
import { TransactionType } from './types'

interface Props {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterType: TransactionType | 'all'
  onFilterChange: (value: TransactionType | 'all') => void
  onRefresh: () => void
  isRefreshing?: boolean
}

const TransactionFilters: React.FC<Props> = ({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
  onRefresh,
  isRefreshing,
}) => {
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
          <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg flex items-center hover:bg-gray-50">
            <FilterIcon size={18} className="mr-2" />
            <span>More Filters</span>
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
    </div>
  )
}

export default TransactionFilters

