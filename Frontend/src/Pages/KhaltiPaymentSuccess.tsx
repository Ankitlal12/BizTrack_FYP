import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { billingAPI } from '../services/api';
import Layout from '../layout/Layout';

const KhaltiPaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [saleData, setSaleData] = useState<any>(null);
  const hasVerified = useRef(false);

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      // Get pidx from URL parameters
      const pidx = searchParams.get('pidx');
      const transactionId = searchParams.get('transaction_id');
      const amount = searchParams.get('amount');
      const purchaseOrderId = searchParams.get('purchase_order_id');

      if (!pidx) {
        setStatus('failed');
        setMessage('Invalid payment link. Missing payment identifier.');
        toast.error('Payment verification failed');
        return;
      }

      console.log('Verifying Khalti payment:', { pidx, transactionId, amount, purchaseOrderId });

      // Verify payment with backend
      const verificationResult = await billingAPI.verifyKhaltiPayment(pidx);

      if (!verificationResult.success) {
        setStatus('failed');
        setMessage(verificationResult.message || 'Payment verification failed');
        toast.error('Payment verification failed', {
          description: verificationResult.message,
        });
        return;
      }

      // Get pending sale data from localStorage
      const pendingSaleData = localStorage.getItem('biztrack_pending_sale');
      if (!pendingSaleData) {
        setStatus('failed');
        setMessage('Sale data not found. Please contact support.');
        toast.error('Sale data not found');
        return;
      }

      const saleInfo = JSON.parse(pendingSaleData);

      // Create the sale with Khalti payment info
      const billData = {
        ...saleInfo,
        khaltiPayment: {
          pidx: verificationResult.pidx,
          transactionId: verificationResult.transaction_id,
          status: verificationResult.status,
        },
      };

      const createdSale = await billingAPI.createBill(billData);

      // Clear pending sale data
      localStorage.removeItem('biztrack_pending_sale');

      setStatus('success');
      setMessage('Payment successful! Your sale has been completed.');
      setSaleData(createdSale);
      
      toast.success('Payment Successful!', {
        description: `Invoice #${createdSale.invoiceNumber} created`,
      });

      // Redirect to billing page after 3 seconds
      setTimeout(() => {
        navigate('/billing', { replace: true });
      }, 3000);
    } catch (error: any) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage(error.message || 'Failed to verify payment');
      toast.error('Payment verification failed', {
        description: error.message,
      });
    }
  };

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-5 sm:p-8 max-w-md w-full text-center mx-4">
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
              {saleData && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="text-lg font-bold text-gray-800">{saleData.invoiceNumber}</p>
                  <p className="text-sm text-gray-600 mt-2">Total Amount</p>
                  <p className="text-lg font-bold text-teal-600">Rs {saleData.total.toFixed(2)}</p>
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
                className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium"
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

export default KhaltiPaymentSuccess;
