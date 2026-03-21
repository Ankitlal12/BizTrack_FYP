import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { billingAPI } from '../services/api';
import Layout from '../layout/Layout';

const EsewaPaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your eSewa payment...');
  const [saleData, setSaleData] = useState<any>(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const completeSaleFromVerification = async (verificationResult: any) => {
    const transactionUuid = verificationResult?.transactionUuid;
    const processingKey = transactionUuid
      ? `biztrack_esewa_processing_${transactionUuid}`
      : null;

    if (processingKey && localStorage.getItem(processingKey) === 'done') {
      setStatus('success');
      setMessage('Payment already processed successfully. Redirecting to billing page...');
      setTimeout(() => navigate('/billing', { replace: true }), 1500);
      return;
    }

    if (processingKey && localStorage.getItem(processingKey) === 'in-progress') {
      setStatus('verifying');
      setMessage('Finalizing your payment. Please wait...');
      return;
    }

    if (processingKey) {
      localStorage.setItem(processingKey, 'in-progress');
    }

    try {
      const pendingSaleData = localStorage.getItem('biztrack_pending_sale');
      if (!pendingSaleData) {
        setStatus('failed');
        setMessage('Sale data not found. Please contact support.');
        toast.error('Sale data not found');
        if (processingKey) localStorage.removeItem(processingKey);
        return;
      }

      const saleInfo = JSON.parse(pendingSaleData);

      const billData = {
        ...saleInfo,
        esewaPayment: {
          transactionUuid: verificationResult.transactionUuid,
          refId: verificationResult.refId,
          status: verificationResult.status,
          totalAmount: verificationResult.totalAmount,
        },
      };

      const createdSale = await billingAPI.createBill(billData);
      localStorage.removeItem('biztrack_pending_sale');
      if (processingKey) {
        localStorage.setItem(processingKey, 'done');
      }

      setStatus('success');
      setMessage('Payment successful! Your sale has been completed.');
      setSaleData(createdSale);

      toast.success('eSewa Payment Successful!', {
        description: `Invoice #${createdSale.invoiceNumber} created`,
      });

      setTimeout(() => navigate('/billing', { replace: true }), 3000);
    } catch (error) {
      if (processingKey) {
        localStorage.removeItem(processingKey);
      }
      throw error;
    }
  };

  const verifyPayment = async () => {
    try {
      const isFailureRoute = location.pathname.includes('/billing/esewa-failure');

      // eSewa sends back a base64-encoded JSON in the `data` query param
      const encodedResponse = searchParams.get('data');
      const normalizedResponse = encodedResponse?.replace(/ /g, '+');

      if (normalizedResponse) {
        try {
          const verificationResult = await billingAPI.verifyEsewaPayment(normalizedResponse);

          if (verificationResult?.success) {
            await completeSaleFromVerification(verificationResult);
            return;
          }
        } catch (verificationError) {
          console.warn('Primary eSewa verification failed, trying fallback status check...', verificationError);
        }
      }

      const pendingSaleData = localStorage.getItem('biztrack_pending_sale');
      const pendingSale = pendingSaleData ? JSON.parse(pendingSaleData) : null;
      const transactionUuid = pendingSale?.esewaTransactionUuid;
      const totalAmount = pendingSale?.esewaTotalAmount || pendingSale?.total;

      if (isFailureRoute && transactionUuid && totalAmount) {
        try {
          const fallbackVerification = await billingAPI.verifyEsewaPaymentStatus(
            transactionUuid,
            totalAmount,
          );

          if (fallbackVerification?.success) {
            await completeSaleFromVerification(fallbackVerification);
            return;
          }
        } catch (fallbackError: any) {
          const fallbackMessage =
            fallbackError?.message ||
            'Payment not completed in eSewa. This can happen due to insufficient wallet balance.';

          setStatus('failed');
          setMessage(
            `${fallbackMessage} Try another eSewa test ID or a lower amount, then retry.`,
          );
          toast.error('eSewa payment not completed', {
            description: fallbackMessage,
          });
          return;
        }
      }

      if (!normalizedResponse && !isFailureRoute) {
        setStatus('failed');
        setMessage('Invalid payment response. Missing data parameter.');
        toast.error('eSewa payment verification failed');
        return;
      }

      setStatus('failed');
      setMessage('Payment was not completed in eSewa. This often means insufficient wallet balance in test account.');
      toast.error('eSewa payment was not completed');
    } catch (error: any) {
      console.error('eSewa payment verification error:', error);
      setStatus('failed');
      setMessage(error.message || 'Failed to verify eSewa payment');
      toast.error('Payment verification failed', { description: error.message });
    }
  };

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 text-green-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying eSewa Payment</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              {saleData && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="text-lg font-bold text-gray-800">{saleData.invoiceNumber}</p>
                  <p className="text-sm text-gray-600 mt-2">Total Amount</p>
                  <p className="text-lg font-bold text-green-600">Rs {saleData.total?.toFixed(2)}</p>
                </div>
              )}
              <p className="text-sm text-gray-500">Redirecting to billing page...</p>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => navigate('/billing', { replace: true })}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                Return to Billing
              </button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default EsewaPaymentSuccess;
