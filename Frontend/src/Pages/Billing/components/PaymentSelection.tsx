import React from 'react'
import { LoaderIcon, AlertCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { ValidationErrors } from '../types'

interface PaymentSectionProps {
  paymentMethod: string
  onPaymentMethodChange: (method: string) => void
  paidAmount: number
  onPaidAmountChange: (amount: number) => void
  totalAmount: number
  notes: string
  onNotesChange: (notes: string) => void
  validationErrors: ValidationErrors
  isProcessing: boolean
  onCompleteSale: () => void
  isDisabled: boolean
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
  notes,
  onNotesChange,
  validationErrors,
  isProcessing,
  onCompleteSale,
  isDisabled,
  totalAmount,
}) => {
  return (
    <div className="space-y-4">
      {/* Khalti-only banner */}
      <div className="p-3 rounded-lg border border-purple-200 bg-purple-50 text-sm text-purple-800">
        <p className="font-medium">Khalti Gateway Payment</p>
        <p className="mt-1">You will be redirected to Khalti to complete payment securely.</p>
      </div>

      <div className="flex justify-between text-sm font-medium">
        <span className="text-gray-600">Total Amount:</span>
        <span>Rs {totalAmount.toFixed(2)}</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
          rows={2}
          placeholder="Add any special instructions..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>

      {validationErrors.general && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircleIcon className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-red-700 text-sm">{validationErrors.general}</p>
        </div>
      )}

      <button
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
        disabled={isDisabled || isProcessing}
        onClick={onCompleteSale}
      >
        {isProcessing ? (
          <>
            <LoaderIcon size={20} className="animate-spin mr-2" />
            Processing...
          </>
        ) : (
          'Proceed to Khalti'
        )}
      </button>
    </div>
  )
}

export default PaymentSection