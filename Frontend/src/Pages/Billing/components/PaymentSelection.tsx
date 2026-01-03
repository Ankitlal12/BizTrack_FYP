import React from 'react'
import { LoaderIcon, AlertCircleIcon } from 'lucide-react'
import { ValidationErrors } from '../types'

interface PaymentSectionProps {
  paymentMethod: string
  onPaymentMethodChange: (method: string) => void
  notes: string
  onNotesChange: (notes: string) => void
  validationErrors: ValidationErrors
  isProcessing: boolean
  onCompleteSale: () => void
  isDisabled: boolean
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
  paymentMethod,
  onPaymentMethodChange,
  notes,
  onNotesChange,
  validationErrors,
  isProcessing,
  onCompleteSale,
  isDisabled,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Method
        </label>
        <select
          className={`w-full border ${
            validationErrors.payment ? 'border-red-500' : 'border-gray-300'
          } rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500`}
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
        >
          <option value="cash">Cash</option>
          <option value="card">Credit/Debit Card</option>
        </select>
        {validationErrors.payment && (
          <p className="text-red-500 text-sm mt-1">
            {validationErrors.payment}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
          rows={2}
          placeholder="Add any special instructions..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        ></textarea>
      </div>
      {validationErrors.general && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircleIcon
            className="text-red-500 mr-2 flex-shrink-0 mt-0.5"
            size={16}
          />
          <p className="text-red-700 text-sm">{validationErrors.general}</p>
        </div>
      )}
      <button
        className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
        disabled={isDisabled || isProcessing}
        onClick={onCompleteSale}
      >
        {isProcessing ? (
          <>
            <LoaderIcon size={20} className="animate-spin mr-2" />
            Processing Sale...
          </>
        ) : (
          'Complete Sale'
        )}
      </button>
    </div>
  )
}

export default PaymentSection

