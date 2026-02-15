import React, { useState } from 'react'
import { SearchIcon, FilterIcon, XIcon } from 'lucide-react'

type InventoryFiltersProps = {
  searchTerm: string
  onSearchChange: (value: string) => void
  categoryFilter: string
  onCategoryChange: (value: string) => void
  categories: string[]
  statusFilter: string
  onStatusChange: (value: string) => void
  supplierFilter: string
  onSupplierChange: (value: string) => void
  suppliers: string[]
  stockMin: string
  onStockMinChange: (value: string) => void
  stockMax: string
  onStockMaxChange: (value: string) => void
  priceMin: string
  onPriceMinChange: (value: string) => void
  priceMax: string
  onPriceMaxChange: (value: string) => void
  costMin: string
  onCostMinChange: (value: string) => void
  costMax: string
  onCostMaxChange: (value: string) => void
  sortBy: 'createdAt' | 'name' | 'stock' | 'price'
  onSortByChange: (value: 'createdAt' | 'name' | 'stock' | 'price') => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (value: 'asc' | 'desc') => void
  onClearFilters: () => void
}

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  categories,
  statusFilter,
  onStatusChange,
  supplierFilter,
  onSupplierChange,
  suppliers,
  stockMin,
  onStockMinChange,
  stockMax,
  onStockMaxChange,
  priceMin,
  onPriceMinChange,
  priceMax,
  onPriceMaxChange,
  costMin,
  onCostMinChange,
  costMax,
  onCostMaxChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onClearFilters,
}) => {
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  const toggleMoreFilters = () => {
    setShowMoreFilters((prev) => !prev)
  }

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    supplierFilter !== 'all' ||
    stockMin !== '' ||
    stockMax !== '' ||
    priceMin !== '' ||
    priceMax !== '' ||
    costMin !== '' ||
    costMax !== '' ||
    sortBy !== 'createdAt' ||
    sortOrder !== 'desc'

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-teal-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <select
          className="border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'All Categories' : c}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          className="border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="out-of-stock">Out of Stock</option>
          <option value="low">Low Stock</option>
          <option value="in-stock">In Stock</option>
        </select>

        {/* Sort By */}
        <div className="flex items-center gap-2">
          <select
            className="border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as 'createdAt' | 'name' | 'stock' | 'price')}
          >
            <option value="createdAt">Sort: Purchase Date</option>
            <option value="name">Sort: Name</option>
            <option value="stock">Sort: Stock</option>
            <option value="price">Sort: Price</option>
          </select>

          {/* Sort Order Toggle Button */}
          <button
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="border border-gray-300 bg-white hover:bg-gray-50 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            title={sortOrder === 'asc' ? 'Ascending order' : 'Descending order'}
          >
            {sortOrder === 'asc' ? (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>

        {/* More Filters Button */}
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Stock Range */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Stock Quantity</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={stockMin}
                  onChange={(e) => onStockMinChange(e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={stockMax}
                  onChange={(e) => onStockMaxChange(e.target.value)}
                />
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Price Range ($)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  step="0.01"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={priceMin}
                  onChange={(e) => onPriceMinChange(e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  step="0.01"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={priceMax}
                  onChange={(e) => onPriceMaxChange(e.target.value)}
                />
              </div>
            </div>

            {/* Cost Range */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Cost Range ($)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  step="0.01"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={costMin}
                  onChange={(e) => onCostMinChange(e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  step="0.01"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={costMax}
                  onChange={(e) => onCostMaxChange(e.target.value)}
                />
              </div>
            </div>

            {/* Supplier Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 block">Supplier</label>
              <select
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
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryFilters
