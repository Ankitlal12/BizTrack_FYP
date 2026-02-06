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
  const [paymentAmount, setPaymentAmount] = useState(0); // Amount to add, not total
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invoice) {
      setPaymentAmount(0); // Reset to 0 for new payment
      setPaymentMethod(invoice.paymentMethod || 'cash');
      setError('');
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const currentPaid = invoice.paidAmount || 0;
  const remainingAmount = calculateRemainingAmount(invoice);
  const maxPayment = remainingAmount; // Can only pay up to remaining amount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (paymentAmount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (paymentAmount > remainingAmount) {
      setError(`Payment amount (${formatCurrency(paymentAmount)}) cannot exceed remaining balance (${formatCurrency(remainingAmount)})`);
      return;
    }

    // Calculate new total paid amount
    const newPaidAmount = currentPaid + paymentAmount;

    // Double check to prevent overpayment
    if (newPaidAmount > invoice.total) {
      setError(`Total payment (${formatCurrency(newPaidAmount)}) cannot exceed invoice total (${formatCurrency(invoice.total)})`);
      return;
    }

    // Determine payment status
    let paymentStatus: 'unpaid' | 'partial' | 'paid';
    if (newPaidAmount >= invoice.total) {
      paymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'unpaid';
    }

    setLoading(true);
    try {
      await onUpdate(invoice._id, {
        paymentStatus,
        paidAmount: newPaidAmount, // Send the new total
        paymentMethod,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    
    // Clear error when user starts typing
    setError('');
    
    // Prevent negative values
    if (amount < 0) {
      setError('Payment amount cannot be negative');
      setPaymentAmount(0);
      return;
    }
    
    // Prevent exceeding remaining balance
    if (amount > remainingAmount) {
      setError(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}`);
      setPaymentAmount(remainingAmount); // Auto-correct to max allowed
      return;
    }
    
    setPaymentAmount(amount);
  };

  const handleQuickPayment = (amount: number) => {
    setPaymentAmount(Math.min(amount, maxPayment));
  };

  // Calculate what the new totals will be after payment
  const newTotalPaid = currentPaid + paymentAmount;
  const newRemaining = invoice.total - newTotalPaid;

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
              <span className="text-gray-600">Already Paid:</span>
              <span className="font-medium text-green-600">{formatCurrency(currentPaid)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-gray-600 font-medium">Remaining Balance:</span>
              <span className="font-bold text-red-600">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>

          {/* Quick Payment Buttons */}
          {remainingAmount > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Payment Options
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleQuickPayment(remainingAmount)}
                  className="flex-1 px-3 py-2 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors font-medium"
                >
                  Pay Full Balance
                  <div className="text-xs font-normal mt-0.5">
                    {formatCurrency(remainingAmount)}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPayment(remainingAmount / 2)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors font-medium"
                >
                  Pay Half
                  <div className="text-xs font-normal mt-0.5">
                    {formatCurrency(remainingAmount / 2)}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Payment Amount Input */}
          <div className="mb-4">
            <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount to Add
            </label>
            <input
              type="number"
              id="paymentAmount"
              value={paymentAmount}
              onChange={(e) => handlePaymentAmountChange(e.target.value)}
              min="0"
              max={maxPayment}
              step="0.01"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                error 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Enter amount to pay"
              required
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                Maximum: {formatCurrency(maxPayment)}
              </p>
              {paymentAmount > remainingAmount && (
                <p className="text-xs text-red-600 font-medium">
                  Exceeds remaining balance!
                </p>
              )}
            </div>
          </div>

          {/* Payment Preview */}
          {paymentAmount > 0 && (
            <div className={`mb-4 p-3 border rounded-md ${
              paymentAmount > remainingAmount 
                ? 'bg-red-50 border-red-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <h4 className={`text-sm font-medium mb-2 ${
                paymentAmount > remainingAmount ? 'text-red-900' : 'text-blue-900'
              }`}>
                {paymentAmount > remainingAmount ? '⚠️ Invalid Payment:' : 'Payment Preview:'}
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className={paymentAmount > remainingAmount ? 'text-red-700' : 'text-blue-700'}>
                    Current Paid:
                  </span>
                  <span className={`font-medium ${paymentAmount > remainingAmount ? 'text-red-900' : 'text-blue-900'}`}>
                    {formatCurrency(currentPaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={paymentAmount > remainingAmount ? 'text-red-700' : 'text-blue-700'}>
                    + Payment Amount:
                  </span>
                  <span className={`font-medium ${paymentAmount > remainingAmount ? 'text-red-900' : 'text-blue-900'}`}>
                    + {formatCurrency(paymentAmount)}
                  </span>
                </div>
                <div className={`flex justify-between border-t pt-1 ${
                  paymentAmount > remainingAmount ? 'border-red-300' : 'border-blue-300'
                }`}>
                  <span className={`font-medium ${paymentAmount > remainingAmount ? 'text-red-700' : 'text-blue-700'}`}>
                    New Total Paid:
                  </span>
                  <span className={`font-bold ${paymentAmount > remainingAmount ? 'text-red-900' : 'text-blue-900'}`}>
                    {formatCurrency(newTotalPaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${paymentAmount > remainingAmount ? 'text-red-700' : 'text-blue-700'}`}>
                    New Remaining:
                  </span>
                  <span className={`font-bold ${newRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.max(0, newRemaining))}
                  </span>
                </div>
                {paymentAmount > remainingAmount && (
                  <div className="mt-2 pt-2 border-t border-red-300">
                    <p className="text-xs text-red-700 font-medium">
                      ⚠️ Payment exceeds remaining balance by {formatCurrency(paymentAmount - remainingAmount)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

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
              New Payment Status
            </label>
            <div className="p-3 bg-gray-50 rounded-md">
              {newTotalPaid >= invoice.total ? (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Fully Paid
                </span>
              ) : newTotalPaid > 0 ? (
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || paymentAmount <= 0 || paymentAmount > remainingAmount}
            >
              {loading ? 'Recording Payment...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentUpdateModal;