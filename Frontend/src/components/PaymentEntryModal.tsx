// ==================== IMPORTS ====================
import React, { useState, useEffect } from 'react'
import { XIcon, IndianRupeeIcon, AlertCircleIcon, PlusIcon, TrashIcon, LoaderIcon } from 'lucide-react'
import { toast } from 'sonner'

// ==================== TYPES ====================

interface PaymentInstallment {
  amount: number
  date: string
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
  onKhaltiPay?: (amount: number) => Promise<void>
}

// ==================== HELPERS ====================

const todayNPT = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' })

const formatMethod = (method: string) =>
  method.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

const blankInstallment = (): PaymentInstallment => ({ amount: 0, date: todayNPT(), method: 'cash', notes: '' })

// ==================== COMPONENT ====================

const PaymentEntryModal: React.FC<PaymentEntryModalProps> = ({
  isOpen, onClose, onSave, totalAmount, paidAmount,
  title = 'Record Payment',
  paymentMethods = ['cash', 'card', 'bank_transfer', 'other'],
  onKhaltiPay,
}) => {
  // ==================== STATE ====================

  const [paymentMode, setPaymentMode] = useState<'single' | 'installment'>('single')

  // Single payment
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(() => paymentMethods[0] || 'cash')
  const [date, setDate] = useState(todayNPT)
  const [notes, setNotes] = useState('')
  const [amountError, setAmountError] = useState('')

  // Installments
  const [installments, setInstallments] = useState<PaymentInstallment[]>([blankInstallment()])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const remainingBalance = totalAmount - (paidAmount || 0)
  const today = todayNPT()

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return
    setPaymentMode('single')
    setAmount('')
    setMethod(paymentMethods[0] || 'cash')
    setDate(todayNPT())
    setNotes('')
    setInstallments([blankInstallment()])
    setIsSubmitting(false)
    setAmountError('')
  }, [isOpen])

  if (!isOpen) return null

  // ==================== SINGLE PAYMENT HANDLERS ====================

  const handleAmountChange = (value: string) => {
    setAmount(value)
    const n = parseFloat(value)
    if (value && n > remainingBalance) setAmountError(`Cannot exceed remaining balance of Rs ${remainingBalance.toFixed(2)}`)
    else if (value && n <= 0) setAmountError('Amount must be greater than 0')
    else setAmountError('')
  }

  // ==================== INSTALLMENT HANDLERS ====================

  const addInstallment = () => setInstallments(prev => [...prev, blankInstallment()])

  const removeInstallment = (index: number) => {
    if (installments.length > 1) setInstallments(prev => prev.filter((_, i) => i !== index))
  }

  const updateInstallment = (index: number, field: keyof PaymentInstallment, value: any) => {
    setInstallments(prev => prev.map((inst, i) => i === index ? { ...inst, [field]: value } : inst))
  }

  const getTotalInstallmentAmount = () =>
    installments.reduce((sum, inst) => sum + (parseFloat(String(inst.amount)) || 0), 0)

  const getInstallmentError = (index: number): string | null => {
    const n = parseFloat(String(installments[index].amount))
    return n > remainingBalance ? `Cannot exceed remaining balance (Rs ${remainingBalance.toFixed(2)})` : null
  }

  const validateInstallments = (): string | null => {
    const total = getTotalInstallmentAmount()
    if (total <= 0) return 'Total installment amount must be greater than 0'
    if (total > remainingBalance) return `Total (Rs ${total.toFixed(2)}) cannot exceed remaining balance (Rs ${remainingBalance.toFixed(2)})`
    for (let i = 0; i < installments.length; i++) {
      const inst = installments[i]
      const n = parseFloat(String(inst.amount))
      if (!n || n <= 0) return `Installment ${i + 1}: Amount must be greater than 0`
      if (n > remainingBalance) return `Installment ${i + 1}: Amount exceeds remaining balance`
      if (!inst.date) return `Installment ${i + 1}: Date is required`
      if (!inst.method) return `Installment ${i + 1}: Payment method is required`
      if (inst.method === 'khalti' && inst.date < today) {
        return `Installment ${i + 1}: Khalti payment date cannot be in the past`
      }
    }
    return null
  }

  // ==================== SUBMIT ====================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (paymentMode === 'single') {
      const n = parseFloat(amount)
      if (!n || n <= 0) { toast.error('Please enter a valid payment amount'); return }
      if (n > remainingBalance) { toast.error(`Cannot exceed remaining balance of Rs ${remainingBalance.toFixed(2)}`); return }
      if (amountError) { toast.error('Please fix validation errors'); return }
      if (method === 'khalti' && date < today) {
        toast.error('Khalti payment date cannot be in the past')
        return
      }

      setIsSubmitting(true)
      try {
        await onSave({ amount: n, date, method, notes: notes.trim() || undefined })
        toast.success('Payment recorded successfully')
        onClose()
      } catch (error: any) {
        toast.error(error?.message || 'Failed to record payment')
      } finally {
        setIsSubmitting(false)
      }
    } else {
      const err = validateInstallments()
      if (err) { toast.error(err); return }

      setIsSubmitting(true)
      try {
        for (const inst of installments) {
          await onSave({ amount: parseFloat(String(inst.amount)), date: inst.date, method: inst.method, notes: inst.notes?.trim() || undefined })
        }
        toast.success(`${installments.length} installment(s) recorded successfully`)
        onClose()
      } catch (error: any) {
        toast.error(error?.message || 'Failed to record installments')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  // ==================== RENDER ====================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">

        {/* Modal header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button onClick={() => !isSubmitting && onClose()} disabled={isSubmitting} title="Close payment modal" className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
            <XIcon size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Payment summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Total Amount:</span><span className="font-medium">Rs {totalAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Already Paid:</span><span className="font-medium">Rs {(paidAmount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-700 font-medium">Remaining Balance:</span>
              <span className={`font-semibold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>Rs {remainingBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
            <div className="flex gap-4">
              {(['single', 'installment'] as const).map(mode => (
                <label key={mode} className="flex items-center">
                  <input type="radio" value={mode} checked={paymentMode === mode} onChange={() => setPaymentMode(mode)} className="mr-2" disabled={isSubmitting} />
                  <span className="text-sm">{mode === 'single' ? 'Single Payment' : 'Installment Payments'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Single payment fields */}
          {paymentMode === 'single' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <IndianRupeeIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number" step="0.01" min="0.01" max={remainingBalance} required
                    value={amount} onChange={e => handleAmountChange(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border ${amountError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
                    placeholder="0.00" disabled={isSubmitting || remainingBalance <= 0}
                  />
                </div>
                {amountError && <p className="text-red-500 text-xs mt-1 flex items-center"><AlertCircleIcon size={14} className="mr-1" />{amountError}</p>}
              </div>

              {paymentMethods.length > 1 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method <span className="text-red-500">*</span></label>
                  <select value={method} onChange={e => setMethod(e.target.value)} title="Payment method" className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500" required disabled={isSubmitting}>
                    {paymentMethods.map(pm => <option key={pm} value={pm}>{formatMethod(pm)}</option>)}
                  </select>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-purple-200 bg-purple-50 flex items-center gap-3">
                  <span className="text-purple-700 font-semibold text-sm">Payment via Khalti</span>
                  <span className="text-xs text-purple-600">You will be redirected to Khalti to complete the payment.</span>
                </div>
              )}

              {method === 'khalti' && onKhaltiPay && paymentMethods.length > 1 && (
                <div className="p-3 rounded-lg border border-purple-200 bg-purple-50 text-sm text-purple-800">
                  <p className="font-medium mb-1">Khalti Digital Wallet</p>
                  <p>You will be redirected to Khalti. Enter the amount above then click "Pay with Khalti".</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date <span className="text-red-500">*</span></label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} min={method === 'khalti' ? today : undefined} title="Payment date" className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500" required disabled={isSubmitting} />
                <p className="text-xs text-gray-500 mt-1">Future dates will be marked as "scheduled"</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Add any notes..." disabled={isSubmitting} />
              </div>
            </>
          ) : (
            /* Installment fields */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Payment Installments</h3>
                <button type="button" onClick={addInstallment} className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700" disabled={isSubmitting}>
                  <PlusIcon size={16} /> Add Installment
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {installments.map((inst, index) => {
                  const instError = getInstallmentError(index)
                  return (
                    <div key={index} className={`border ${instError ? 'border-red-300 bg-red-50' : 'border-gray-200'} rounded-lg p-4 space-y-3`}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">Installment {index + 1}</h4>
                        {installments.length > 1 && (
                          <button type="button" onClick={() => removeInstallment(index)} title={`Remove installment ${index + 1}`} className="text-red-500 hover:text-red-700" disabled={isSubmitting}>
                            <TrashIcon size={16} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Amount <span className="text-red-500">*</span></label>
                          <input type="number" step="0.01" min="0.01" max={remainingBalance} required value={inst.amount || ''} onChange={e => updateInstallment(index, 'amount', parseFloat(e.target.value) || 0)} className={`w-full border ${instError ? 'border-red-500' : 'border-gray-300'} rounded py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500`} placeholder="0.00" disabled={isSubmitting} />
                          {instError && <p className="text-red-500 text-xs mt-1 flex items-center"><AlertCircleIcon size={12} className="mr-1" />{instError}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
                          <input type="date" required value={inst.date} onChange={e => updateInstallment(index, 'date', e.target.value)} min={inst.method === 'khalti' ? today : undefined} title={`Installment ${index + 1} date`} className="w-full border border-gray-300 rounded py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" disabled={isSubmitting} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Method <span className="text-red-500">*</span></label>
                        <select value={inst.method} onChange={e => updateInstallment(index, 'method', e.target.value)} title={`Installment ${index + 1} payment method`} className="w-full border border-gray-300 rounded py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" required disabled={isSubmitting}>
                          {paymentMethods.map(pm => <option key={pm} value={pm}>{formatMethod(pm)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (Optional)</label>
                        <input type="text" value={inst.notes || ''} onChange={e => updateInstallment(index, 'notes', e.target.value)} className="w-full border border-gray-300 rounded py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Add notes..." disabled={isSubmitting} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700 font-medium">Total Installment Amount:</span>
                  <span className={`font-semibold ${getTotalInstallmentAmount() > remainingBalance ? 'text-red-600' : 'text-blue-900'}`}>
                    Rs {getTotalInstallmentAmount().toFixed(2)}
                  </span>
                </div>
                {getTotalInstallmentAmount() > remainingBalance && (
                  <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 flex items-start gap-2">
                    <AlertCircleIcon size={14} className="flex-shrink-0 mt-0.5" />
                    <span>Total exceeds remaining balance (Rs {remainingBalance.toFixed(2)})</span>
                  </div>
                )}
                <p className="text-xs text-blue-600 mt-1">Future-dated payments will be marked as "scheduled"</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => !isSubmitting && onClose()} disabled={isSubmitting} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            {paymentMode === 'single' && method === 'khalti' && onKhaltiPay ? (
              <button
                type="button"
                disabled={isSubmitting || remainingBalance <= 0 || !!amountError || !amount}
                onClick={async () => {
                  const n = parseFloat(amount)
                  if (!n || n <= 0) { toast.error('Please enter a valid payment amount'); return }
                  if (n > remainingBalance) { toast.error(`Cannot exceed remaining balance of Rs ${remainingBalance.toFixed(2)}`); return }
                  if (date < today) { toast.error('Khalti payment date cannot be in the past'); return }
                  setIsSubmitting(true)
                  try { await onKhaltiPay(n) } catch (err: any) { toast.error(err?.message || 'Failed to initiate Khalti payment'); setIsSubmitting(false) }
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <><LoaderIcon size={16} className="animate-spin" /> Redirecting...</> : 'Pay with Khalti'}
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting || remainingBalance <= 0} className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50">
                {isSubmitting ? 'Recording...' : paymentMode === 'installment' ? 'Record Installments' : 'Record Payment'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default PaymentEntryModal
