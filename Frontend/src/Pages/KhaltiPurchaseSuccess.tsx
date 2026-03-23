import React, { useEffect, useState } from 'react'
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

  useEffect(() => {
    verifyPayment()
  }, [])

  const verifyPayment = async () => {
    try {
      const pidx = searchParams.get('pidx')
      const storedContext = localStorage.getItem('biztrack_khalti_purchase')
      const context = storedContext ? JSON.parse(storedContext) : null

      if (!pidx) {
        setStatus('failed')
        setMessage('Invalid payment link. Missing payment identifier.')
        return
      }

      // Verify payment with backend — also records the payment on the purchase if purchaseId is known
      const verificationResult = await purchasesAPI.verifyKhaltiPayment(
        pidx,
        context?.purchaseId ? { purchaseId: context.purchaseId, amount: context.amount } : undefined
      )
      if (!verificationResult.success) {
        setStatus('failed')
        setMessage(verificationResult.message || 'Payment verification failed')
        toast.error('Payment verification failed')
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

      const updatedInstallments = (purchaseOrder.paymentInstallments || []).map((inst: any) =>
        inst.method === 'khalti'
          ? { ...inst, status: 'completed', khaltiPidx: verificationResult.pidx, khaltiTransactionId: verificationResult.transaction_id }
          : inst
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
      setStatus('failed')
      setMessage(error.message || 'Failed to verify payment')
      toast.error('Payment verification failed', { description: error.message })
    }
  }

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 text-teal-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Payment</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
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
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h2>
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
