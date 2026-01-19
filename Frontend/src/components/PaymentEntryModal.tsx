import React, { useState, useEffect } from 'react'
import { XIcon, IndianRupeeIcon, AlertCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

interface PaymentRecord {
  amount: number
  date: string | Date
  method: string
  notes?: string
}

interface PaymentEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payment: { amount: number; date: string; method: string; notes?: string }) => Promise<void>
  totalAmount: number
  paidAmount: number
  title?: string
  paymentMethods?: string[]
}

const PaymentEntryModal: React.FC<PaymentEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  totalAmount,
  paidAmount,
  title = 'Record Payment',
  paymentMethods = ['cash', 'card', 'bank_transfer', 'other'],
}) => {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [amountError, setAmountError] = useState('')

  const remainingBalance = totalAmount - (paidAmount || 0)

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setAmount('')
      setMethod('cash')
      setDate(new Date().toISOString().split('T')[0])
      setNotes('')
      setIsSubmitting(false)
      setAmountError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleAmountChange = (value: string) => {
    setAmount(value)
    const paymentAmount = parseFloat(value)
    
    if (value && paymentAmount > remainingBalance) {
      setAmountError(`Payment amount cannot exceed remaining balance of Rs ${remainingBalance.toFixed(2)}`)
    } else if (value && paymentAmount <= 0) {
      setAmountError('Payment amount must be greater than 0')
    } else {
      setAmountError('')
    }
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const paymentAmount = parseFloat(amount)
    
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (paymentAmount > remainingBalance) {
      toast.error(`Payment amount cannot exceed remaining balance of Rs ${remainingBalance.toFixed(2)}`)
      return
    }

    if (amountError) {
      toast.error('Please fix the validation errors before submitting')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave({
        amount: paymentAmount,
        date,
        method,
        notes: notes.trim() || undefined,
      })
      toast.success('Payment recorded successfully')
      onClose()
    } catch (error: any) {
      console.error('Failed to record payment:', error)
      toast.error(error?.message || 'Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const formatMethod = (method: string) => {
    return method
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XIcon size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">Rs {totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Already Paid:</span>
              <span className="font-medium">Rs {(paidAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-700 font-medium">Remaining Balance:</span>
              <span className={`font-semibold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                Rs {remainingBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupeeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingBalance}
                required
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border ${amountError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
                placeholder="0.00"
                disabled={isSubmitting || remainingBalance <= 0}
              />
            </div>
            {amountError && (
              <p className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircleIcon size={14} className="mr-1" />
                {amountError}
              </p>
            )}
            {remainingBalance <= 0 && (
              <p className="text-green-600 text-xs mt-1 flex items-center">
                <AlertCircleIcon size={14} className="mr-1" />
                Payment already completed
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
              disabled={isSubmitting}
            >
              {paymentMethods.map((pm) => (
                <option key={pm} value={pm}>
                  {formatMethod(pm)}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Add any notes about this payment..."
              disabled={isSubmitting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || remainingBalance <= 0}
              className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PaymentEntryModal
