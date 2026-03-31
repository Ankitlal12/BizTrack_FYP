import React from 'react'
import { Loader2, AlertCircle, Zap, StickyNote } from 'lucide-react'
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
  const canPay = !isDisabled && !isProcessing && totalAmount > 0

  return (
    <div className="space-y-3">
      {/* Amount due */}
      <div className="rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 p-4 text-white">
        <p className="text-xs font-medium text-teal-200 uppercase tracking-widest">Amount Due</p>
        <p className="text-3xl font-extrabold mt-1 tracking-tight">
          Rs {totalAmount.toFixed(2)}
        </p>
      </div>

      {/* Khalti badge */}
      <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-purple-900">Khalti Digital Wallet</p>
          <p className="text-xs text-purple-600 mt-0.5">Redirects to Khalti for secure payment</p>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
          <StickyNote className="w-3.5 h-3.5" />
          Notes
        </label>
        <textarea
          className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none bg-gray-50 placeholder-gray-400"
          rows={2}
          placeholder="Special instructions..."
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
        />
      </div>

      {/* Error */}
      {validationErrors.general && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-xs">{validationErrors.general}</p>
        </div>
      )}

      {/* Hint when disabled */}
      {isDisabled && !isProcessing && (
        <p className="text-xs text-center text-gray-400 py-1">
          {totalAmount === 0
            ? '← Add products to cart first'
            : '← Select a customer first'}
        </p>
      )}

      {/* Pay button */}
      <button
        onClick={onCompleteSale}
        disabled={!canPay}
        className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 ${
          canPay
            ? 'bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-lg shadow-purple-200'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isProcessing ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
        ) : (
          <><Zap className="w-4 h-4" />Pay Rs {totalAmount.toFixed(2)} with Khalti</>
        )}
      </button>
    </div>
  )
}

export default PaymentSection
