import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../layout/Layout';
import InvoiceDetailsModal from './InvoiceDetailsModal';
import SendEmailModal from './SendEmailModal';
import { Invoice } from './types';
import { invoicesAPI } from '../../services/api';
import { toast } from 'sonner';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailingInvoiceId, setEmailingInvoiceId] = useState<string | null>(null);

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

  const handleClose = () => {
    navigate('/invoices');
  };

  const handleEmailInvoice = () => {
    if (!invoice) return;
    setShowEmailModal(true);
  };

  const handleSendEmail = async (email: string) => {
    if (!invoice) return;

    try {
      setEmailingInvoiceId(invoice._id);
      await invoicesAPI.sendEmail(invoice._id, { email });
      toast.success(`Invoice sent to ${email}`);
    } catch (err: any) {
      const message = err?.message || 'Failed to send invoice email';
      toast.error(message);
      throw err;
    } finally {
      setEmailingInvoiceId(null);
    }
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
          onEmailInvoice={handleEmailInvoice}
          emailSending={Boolean(invoice?._id && emailingInvoiceId === invoice?._id)}
        />

        <SendEmailModal
          invoice={invoice}
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onSend={handleSendEmail}
          isSending={emailingInvoiceId === invoice?._id}
        />
      </div>
    </Layout>
  );
};

export default InvoiceDetail;