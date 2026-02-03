import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Layout from '../../layout/Layout';
import InvoiceDetailsModal from './InvoiceDetailsModal';
import PaymentUpdateModal from './PaymentUpdateModal';
import { Invoice } from './types';
import { invoicesAPI } from '../../services/api';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchInvoice(id);
    }
  }, [id]);

  const fetchInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      setError('');
      const fetchedInvoice = await invoicesAPI.getById(invoiceId);
      setInvoice(fetchedInvoice);
    } catch (err: any) {
      setError('Failed to fetch invoice');
      console.error('Error fetching invoice:', err);
      toast.error('Invoice not found');
    } finally {
      setLoading(false);
    }
  };

  const handleEditInvoice = () => {
    // TODO: Implement edit functionality
    console.log('Edit invoice:', invoice);
  };

  const handleUpdatePayment = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentUpdate = async (invoiceId: string, paymentData: any) => {
    try {
      await invoicesAPI.updatePayment(invoiceId, paymentData);
      // Refresh the invoice data
      if (id) {
        await fetchInvoice(id);
      }
      setShowPaymentModal(false);
      toast.success('Payment updated successfully');
    } catch (err) {
      throw new Error('Failed to update payment');
    }
  };

  const handleClose = () => {
    navigate('/invoices');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !invoice) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h2>
            <p className="text-gray-600 mb-4">The requested invoice could not be found.</p>
            <button
              onClick={() => navigate('/invoices')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Back to Invoices
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/invoices')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Invoices
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Invoice Details - {invoice.invoiceNumber}
          </h1>
        </div>

        <InvoiceDetailsModal
          invoice={invoice}
          isOpen={true}
          onClose={handleClose}
          onEdit={handleEditInvoice}
          onUpdatePayment={handleUpdatePayment}
        />

        <PaymentUpdateModal
          invoice={invoice}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onUpdate={handlePaymentUpdate}
        />
      </div>
    </Layout>
  );
};

export default InvoiceDetail;