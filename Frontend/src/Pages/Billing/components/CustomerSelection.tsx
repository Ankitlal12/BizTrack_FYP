import React from 'react'
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
    <div className="space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Search customers..."
          className="flex-1 border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={searchCustomer}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button
          onClick={onNewCustomerClick}
          className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg"
        >
          New Customer
        </button>
      </div>
      {validationError && (
        <p className="text-red-500 text-sm">{validationError}</p>
      )}
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {customer.name}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{customer.email}</div>
                  <div className="text-sm text-gray-500">{customer.phone}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button
                    onClick={() => onSelectCustomer(customer)}
                    className="text-teal-600 hover:text-teal-900 text-sm font-medium"
                  >
                    Select
                  </button>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-3 text-center text-sm text-gray-500"
                >
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CustomerSelection

