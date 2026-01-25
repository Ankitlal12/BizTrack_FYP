import React, { useState, useEffect } from 'react';
import { Invoice } from './types';
import { formatCurrency, calculateRemainingAmount } from './utils';

interface PaymentUpdateModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (invoiceId: string, paymentData: PaymentUpdateData) => Promise<void>;
}

interface PaymentUpdateData {
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paidAmount: number;
  paymentMethod?: string;
}

const PaymentUpdateModal: React.FC<PaymentUpdateModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invoice) {
      setPaidAmount(invoice.paidAmount);
      setPaymentMethod(invoice.paymentMethod || 'cash');
      setError('');
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const remainingAmount = calculateRemainingAmount(invoice);
  const maxPayment = invoice.total;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (paidAmount < 0) {
      setError('Payment amount cannot be negative');
      return;
    }

    if (paidAmount > maxPayment) {
      setError(`Payment amount cannot exceed total amount (${formatCurrency(maxPayment)})`);
      return;
    }

    // Determine payment status
    let paymentStatus: 'unpaid' | 'partial' | 'paid';
    if (paidAmount >= invoice.total) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'unpaid';
    }

    setLoading(true);
    try {
      await onUpdate(invoice._id, {
        paymentStatus,
        paidAmount,
        paymentMethod,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPayment = (amount: number) => {
    setPaidAmount(Math.min(amount, maxPayment));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Update Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Invoice Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-900">Invoice:</span>
              <span className="text-gray-900">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Currently Paid:</span>
              <span className="font-medium text-green-600">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Remaining:</span>
              <span className="font-medium text-red-600">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>

          {/* Quick Payment Buttons */}
          {remainingAmount > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Payment
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleQuickPayment(remainingAmount)}
                  className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
                >
                  Pay Remaining ({formatCurrency(remainingAmount)})
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPayment(invoice.total)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                >
                  Pay Full ({formatCurrency(invoice.total)})
                </button>
              </div>
            </div>
          )}

          {/* Payment Amount */}
          <div className="mb-4">
            <label htmlFor="paidAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Total Paid Amount
            </label>
            <input
              type="number"
              id="paidAmount"
              value={paidAmount}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              min="0"
              max={maxPayment}
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum: {formatCurrency(maxPayment)}
            </p>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit">Credit</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Payment Status Preview */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <div className="p-3 bg-gray-50 rounded-md">
              {paidAmount >= invoice.total ? (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Paid
                </span>
              ) : paidAmount > 0 ? (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Partially Paid
                </span>
              ) : (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  Unpaid
                </span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentUpdateModal;