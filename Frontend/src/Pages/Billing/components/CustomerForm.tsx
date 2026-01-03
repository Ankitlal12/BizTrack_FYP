import React from 'react'
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`w-full border ${
              validationErrors.name ? 'border-red-500' : 'border-gray-300'
            } rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500`}
            value={newCustomer.name}
            onChange={(e) =>
              onCustomerChange({
                ...newCustomer,
                name: e.target.value,
              })
            }
          />
          {validationErrors.name && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.name}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`w-full border ${
              validationErrors.phone ? 'border-red-500' : 'border-gray-300'
            } rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500`}
            value={newCustomer.phone}
            onChange={(e) =>
              onCustomerChange({
                ...newCustomer,
                phone: e.target.value,
              })
            }
          />
          {validationErrors.phone && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.phone}
            </p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          className={`w-full border ${
            validationErrors.email ? 'border-red-500' : 'border-gray-300'
          } rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500`}
          value={newCustomer.email}
          onChange={(e) =>
            onCustomerChange({
              ...newCustomer,
              email: e.target.value,
            })
          }
        />
        {validationErrors.email && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
        )}
      </div>
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg"
        >
          Save Customer
        </button>
      </div>
    </div>
  )
}

export default CustomerForm

