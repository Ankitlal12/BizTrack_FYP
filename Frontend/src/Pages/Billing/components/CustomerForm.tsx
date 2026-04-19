import React from 'react'
import { UserPlus, X } from 'lucide-react'
import { NewCustomer, ValidationErrors } from '../types'

interface CustomerFormProps {
  newCustomer: NewCustomer
  onCustomerChange: (customer: NewCustomer) => void
  onSave: () => void
  onCancel: () => void
  validationErrors: ValidationErrors
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  newCustomer,
  onCustomerChange,
  onSave,
  onCancel,
  validationErrors,
}) => {
  return (
    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-semibold text-teal-800">New Customer</span>
        </div>
        <button onClick={onCancel} title="Close" aria-label="Close" className="p-1 hover:bg-teal-100 rounded transition-colors">
          <X className="w-4 h-4 text-teal-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter customer name"
            className={`w-full border text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              validationErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
            }`}
            value={newCustomer.name}
            onChange={e => onCustomerChange({ ...newCustomer, name: e.target.value })}
          />
          {validationErrors.name && <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="98XXXXXXXX"
            className={`w-full border text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              validationErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
            }`}
            value={newCustomer.phone}
            onChange={e => onCustomerChange({ ...newCustomer, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            maxLength={10}
            inputMode="numeric"
          />
          {validationErrors.phone && <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email (optional)</label>
          <input
            type="email"
            placeholder="customer@email.com"
            className={`w-full border text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              validationErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
            }`}
            value={newCustomer.email}
            onChange={e => onCustomerChange({ ...newCustomer, email: e.target.value })}
          />
          {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
        </div>
      </div>

      {validationErrors.general && (
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded p-2">{validationErrors.general}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="flex-1 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
        >
          Save Customer
        </button>
      </div>
    </div>
  )
}

export default CustomerForm
