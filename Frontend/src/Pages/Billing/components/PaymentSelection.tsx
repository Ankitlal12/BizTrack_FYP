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
  paymentMethod,
  onPaymentMethodChange,
  paidAmount,
  onPaidAmountChange,
  totalAmount,
  notes,
  onNotesChange,
  validationErrors,
  isProcessing,
  onCompleteSale,
  isDisabled,
}) => {
  const remainingAmount = totalAmount - paidAmount
  const isFullyPaid = paidAmount >= totalAmount
  const isPartialPayment = paidAmount > 0 && paidAmount < totalAmount

  const handlePaidAmountChange = (amount: number) => {
    if (amount > totalAmount) {
      // Show toast message for exceeding amount
      toast.error(`Payment amount cannot exceed total amount of Rs ${totalAmount.toFixed(2)}`)
      return
    }
    onPaidAmountChange(amount)
  }

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
          <option value="bank_transfer">Bank Transfer</option>
          <option value="other">Other</option>
        </select>
        {validationErrors.payment && (
          <p className="text-red-500 text-sm mt-1">
            {validationErrors.payment}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            Rs
          </span>
          <input
            type="number"
            min="0"
            max={totalAmount}
            step="0.01"
            className={`w-full border ${
              validationErrors.paidAmount ? 'border-red-500' : 'border-gray-300'
            } rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-teal-500`}
            value={paidAmount || ''}
            onChange={(e) => handlePaidAmountChange(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
        
        {/* Quick payment buttons */}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => onPaidAmountChange(totalAmount)}
            className="text-xs bg-teal-100 hover:bg-teal-200 text-teal-700 px-2 py-1 rounded"
          >
            Full Amount
          </button>
          <button
            type="button"
            onClick={() => onPaidAmountChange(0)}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
          >
            Clear
          </button>
        </div>
        
        {validationErrors.paidAmount && (
          <p className="text-red-500 text-sm mt-1">
            {validationErrors.paidAmount}
          </p>
        )}
        
        {/* Payment Status Display */}
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-medium">Rs {totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Paid Amount:</span>
            <span className="font-medium">Rs {paidAmount.toFixed(2)}</span>
          </div>
          {remainingAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining:</span>
              <span className="font-medium text-orange-600">Rs {remainingAmount.toFixed(2)}</span>
            </div>
          )}
          
          {/* Payment Status Badge */}
          <div className="flex justify-end mt-2">
            {isFullyPaid ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Fully Paid
              </span>
            ) : isPartialPayment ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Partial Payment
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Unpaid
              </span>
            )}
          </div>
        </div>
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