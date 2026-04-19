import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { purchasesAPI } from '../services/api'
import Layout from '../layout/Layout'

const KhaltiPurchaseSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying')
  const [message, setMessage] = useState('Verifying your payment...')
  const [purchaseData, setPurchaseData] = useState<any>(null)
  const hasVerified = useRef(false)

  const isFutureDate = (dateStr?: string) => {
    if (!dateStr) return false
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const dateOnly = new Date(dateStr)
    dateOnly.setHours(0, 0, 0, 0)
    return dateOnly > todayStart
  }

  const applyKhaltiSettlementToInstallments = (
    installments: any[],
    paidAmount: number,
    pidx: string,
    transactionId: string,
    extraNote?: string,
  ) => {
    let remaining = Number(paidAmount || 0)
    const updated: any[] = []

    for (const inst of installments || []) {
      const amount = Number(inst.amount || 0)
      const isImmediateKhalti = inst.method === 'khalti' && !isFutureDate(inst.dueDate)

      if (!isImmediateKhalti || amount <= 0) {
        updated.push(inst)
        continue
      }

      if (remaining <= 0) {
        updated.push(inst)
        continue
      }

      if (remaining >= amount - 0.001) {
        updated.push({
          ...inst,
          status: 'completed',
          khaltiPidx: pidx,
          khaltiTransactionId: transactionId,
          notes: `${inst.notes || ''}${inst.notes ? ' | ' : ''}${extraNote || ''}`.trim(),
        })
        remaining -= amount
        continue
      }

      updated.push({
        ...inst,
        amount: Number(remaining.toFixed(2)),
        status: 'completed',
        khaltiPidx: pidx,
        khaltiTransactionId: transactionId,
        notes: `${inst.notes || ''}${inst.notes ? ' | ' : ''}${extraNote || ''}`.trim(),
      })

      updated.push({
        ...inst,
        amount: Number((amount - remaining).toFixed(2)),
        status: 'scheduled',
        notes: `${inst.notes || ''}${inst.notes ? ' | ' : ''}Remaining due after partial Khalti payment`.trim(),
      })

      remaining = 0
    }

    return updated
  }

  const fallbackExistingPurchasePayment = async (context: any, pidx: string, reason: string) => {
    if (!context?.purchaseId || !context?.amount) {
      throw new Error('Missing purchase payment context for fallback callback')
    }

    const updatedPurchase = await purchasesAPI.recordPayment(context.purchaseId, {
      amount: context.amount,
      date: new Date().toISOString(),
      method: 'khalti',
      notes: `Khalti fallback callback used (pidx: ${pidx}). Reason: ${reason}`,
    })

    localStorage.removeItem('biztrack_khalti_purchase')
    setStatus('success')
    setMessage('Khalti verification failed, but payment was recorded in fallback mode. Please verify transaction later.')
    setPurchaseData({
      purchaseNumber: updatedPurchase.purchaseNumber || context.purchaseNumber || '',
      total: context.amount || 0,
    })
    toast.success('Purchase payment recorded in fallback mode')
    setTimeout(() => navigate('/purchases', { replace: true }), 3000)
  }

  const fallbackNewPurchaseCreation = async (pidx: string, reason: string) => {
    const pendingData = localStorage.getItem('biztrack_pending_purchase')
    if (!pendingData) {
      throw new Error('Purchase data not found for fallback callback')
    }

    const purchaseOrder = JSON.parse(pendingData)
    const fallbackPaidAmount = (purchaseOrder.paymentInstallments || [])
      .filter((inst: any) => inst.method === 'khalti' && !isFutureDate(inst.dueDate))
      .reduce((sum: number, inst: any) => sum + Number(inst.amount || 0), 0)

    const updatedInstallments = applyKhaltiSettlementToInstallments(
      purchaseOrder.paymentInstallments || [],
      fallbackPaidAmount,
      pidx,
      `fallback-${Date.now()}`,
      `Fallback callback used: ${reason}`,
    )

    const createdPurchase = await purchasesAPI.create({
      ...purchaseOrder,
      paymentInstallments: updatedInstallments,
      khaltiPayment: {
        pidx,
        transactionId: `fallback-${Date.now()}`,
        status: 'pending_verification',
      },
      notes: `${purchaseOrder.notes || ''}${purchaseOrder.notes ? ' | ' : ''}Khalti fallback callback used: ${reason}`,
    })

    localStorage.removeItem('biztrack_pending_purchase')
    setStatus('success')
    setMessage('Khalti verification failed, but purchase was created in fallback mode. Please verify transaction later.')
    setPurchaseData(createdPurchase)
    toast.success('Purchase created in fallback mode')
    setTimeout(() => navigate('/purchases', { replace: true }), 3000)
  }

  useEffect(() => {
    if (hasVerified.current) return
    hasVerified.current = true
    verifyPayment()
  }, [])

  const verifyPayment = async () => {
    try {
      const pidx = searchParams.get('pidx')
      const storedContext = localStorage.getItem('biztrack_khalti_purchase')
      const storedInstallment = localStorage.getItem('biztrack_khalti_installment')
      const context = storedContext ? JSON.parse(storedContext) : null
      const installmentContext = storedInstallment ? JSON.parse(storedInstallment) : null

      if (!pidx) {
        setStatus('failed')
        setMessage('Invalid payment link. Missing payment identifier.')
        return
      }

      // Installment payment flow
      if (installmentContext?.purchaseId && installmentContext?.installmentIndex !== undefined) {
        const verificationResult = await purchasesAPI.verifyKhaltiInstallmentPayment({
          pidx,
          purchaseId: installmentContext.purchaseId,
          installmentIndex: installmentContext.installmentIndex,
          amount: installmentContext.amount,
        })

        localStorage.removeItem('biztrack_khalti_installment')

        if (!verificationResult.success) {
          await fallbackExistingPurchasePayment(installmentContext, pidx, verificationResult.message || 'installment verification unsuccessful')
          return
        }

        setStatus('success')
        setMessage(`Installment #${installmentContext.installmentIndex + 1} of Rs ${installmentContext.amount?.toFixed(2)} paid successfully.`)
        setPurchaseData({
          purchaseNumber: installmentContext.purchaseNumber || '',
          total: installmentContext.amount || 0,
        })
        toast.success('Installment Payment Successful!')
        setTimeout(() => navigate('/purchases', { replace: true }), 3000)
        return
      }

      // Verify payment with backend — also records the payment on the purchase if purchaseId is known
      const verificationResult = await purchasesAPI.verifyKhaltiPayment(
        pidx,
        context?.purchaseId ? { purchaseId: context.purchaseId, amount: context.amount } : undefined
      )
      if (!verificationResult.success) {
        if (context?.purchaseId) {
          await fallbackExistingPurchasePayment(context, pidx, verificationResult.message || 'payment verification unsuccessful')
        } else {
          await fallbackNewPurchaseCreation(pidx, verificationResult.message || 'purchase verification unsuccessful')
        }
        return
      }

      // If this was a payment on an existing purchase (not a new purchase creation)
      if (context?.purchaseId) {
        localStorage.removeItem('biztrack_khalti_purchase')
        setStatus('success')
        setMessage('Payment recorded successfully on your purchase order.')
        setPurchaseData({ purchaseNumber: context.purchaseNumber || '', total: context.amount || 0 })
        toast.success('Khalti Payment Successful!')
        setTimeout(() => navigate('/purchases', { replace: true }), 3000)
        return
      }

      // Legacy flow: creating a new purchase from pending data in localStorage
      const pendingData = localStorage.getItem('biztrack_pending_purchase')
      if (!pendingData) {
        setStatus('failed')
        setMessage('Purchase data not found. Please contact support.')
        toast.error('Purchase data not found')
        return
      }

      const purchaseOrder = JSON.parse(pendingData)

      const updatedInstallments = applyKhaltiSettlementToInstallments(
        purchaseOrder.paymentInstallments || [],
        Number(verificationResult.total_amount || 0),
        verificationResult.pidx,
        verificationResult.transaction_id,
      )

      const createdPurchase = await purchasesAPI.create({
        ...purchaseOrder,
        paymentInstallments: updatedInstallments,
        khaltiPayment: {
          pidx: verificationResult.pidx,
          transactionId: verificationResult.transaction_id,
          status: verificationResult.status,
        },
      })

      localStorage.removeItem('biztrack_pending_purchase')

      setStatus('success')
      setMessage('Payment successful! Your purchase order has been created.')
      setPurchaseData(createdPurchase)

      toast.success('Payment Successful!', {
        description: `Purchase order ${createdPurchase.purchaseNumber} created`,
      })

      setTimeout(() => navigate('/purchases', { replace: true }), 3000)
    } catch (error: any) {
      console.error('Purchase payment verification error:', error)
      try {
        const pidx = searchParams.get('pidx')
        const storedContext = localStorage.getItem('biztrack_khalti_purchase')
        const context = storedContext ? JSON.parse(storedContext) : null

        if (!pidx) {
          throw error
        }

        if (context?.purchaseId) {
          await fallbackExistingPurchasePayment(context, pidx, error.message || 'verification request failed')
        } else {
          await fallbackNewPurchaseCreation(pidx, error.message || 'verification request failed')
        }
      } catch (fallbackError: any) {
        setStatus('failed')
        setMessage(fallbackError.message || error.message || 'Failed to verify payment')
        toast.error('Payment verification failed', { description: fallbackError.message || error.message })
      }
    }
  }

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-5 sm:p-8 max-w-md w-full text-center mx-4">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 text-teal-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Verifying Payment</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              {purchaseData && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">Purchase Order</p>
                  <p className="text-lg font-bold text-gray-800">{purchaseData.purchaseNumber}</p>
                  <p className="text-sm text-gray-600 mt-2">Total Amount</p>
                  <p className="text-lg font-bold text-teal-600">Rs {purchaseData.total?.toFixed(2)}</p>
                </div>
              )}
              <p className="text-sm text-gray-500">Redirecting to purchases...</p>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Payment Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => navigate('/purchases', { replace: true })}
                className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Return to Purchases
              </button>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default KhaltiPurchaseSuccess
