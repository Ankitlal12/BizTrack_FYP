import React from 'react'
import { SearchIcon } from 'lucide-react'

type InventoryFiltersProps = {
  searchTerm: string
  onSearchChange: (value: string) => void
  categoryFilter: string
  onCategoryChange: (value: string) => void
  categories: string[]
}

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  categories,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex-1 relative">
        <SearchIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by name or SKU..."
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-teal-500"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
        className="border border-gray-300 rounded-lg py-2 px-4"
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {c === 'all' ? 'All Categories' : c}
          </option>
        ))}
      </select>
    </div>
  )
}

export default InventoryFilters

