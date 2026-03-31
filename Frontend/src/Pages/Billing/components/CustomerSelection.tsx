import React from 'react'
import { Search, UserPlus, User } from 'lucide-react'
import { Customer } from '../types'

interface CustomerSelectionProps {
  searchCustomer: string
  onSearchChange: (value: string) => void
  filteredCustomers: Customer[]
  onSelectCustomer: (customer: Customer) => void
  onNewCustomerClick: () => void
  validationError?: string
}

const CustomerSelection: React.FC<CustomerSelectionProps> = ({
  searchCustomer,
  onSearchChange,
  filteredCustomers,
  onSelectCustomer,
  onNewCustomerClick,
  validationError,
}) => {
  return (
    <div className="space-y-3">
      {/* Search + New button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
              validationError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
            }`}
            value={searchCustomer}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        <button
          onClick={onNewCustomerClick}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          New
        </button>
      </div>

      {validationError && (
        <p className="text-red-500 text-xs font-medium">{validationError}</p>
      )}

      {/* Always-visible customer list */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              {searchCustomer ? 'No customers match your search' : 'No customers yet'}
            </p>
            <button
              onClick={onNewCustomerClick}
              className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium hover:underline"
            >
              + Add first customer
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {filteredCustomers.map(customer => (
              <button
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 text-left transition-colors group"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white text-sm font-bold">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-teal-700 transition-colors">
                    {customer.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {customer.phone}
                    {customer.email ? <span className="text-gray-400"> · {customer.email}</span> : null}
                  </p>
                </div>
                {/* Select pill */}
                <span className="text-xs font-semibold text-teal-600 bg-teal-50 group-hover:bg-teal-100 px-2.5 py-1 rounded-full transition-colors flex-shrink-0">
                  Select →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomerSelection
