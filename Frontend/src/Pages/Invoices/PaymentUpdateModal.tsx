import React, { useState, useEffect } from 'react';
import { XIcon, PlusIcon, TrashIcon, AlertCircleIcon } from 'lucide-react';
import { Invoice } from './types';
import { formatCurrency } from './utils';
import { formatNepaliDateTime } from '../../utils/dateUtils';

interface PaymentData {
  amount: number;
  date: string;
  method: string;
  notes?: string;
}

interface PaymentUpdateModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  // onSave accepts either a single payment or a batch via { payments: [...] }
  onSave: (invoiceId: string, paymentData: PaymentData | { payments: PaymentData[] }) => Promise<void>;
}

interface Installment {
  id: number;
  amount: number;
  date: string;
  method: string;
  notes: string;
}

const PAYMENT_METHODS = ['khalti'];

const formatMethod = (m: string) =>
  m === 'khalti' ? 'Khalti' : m.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const todayNPT = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' });

const isFutureDate = (dateStr: string) => {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d > today;
};

const PaymentUpdateModal: React.FC<PaymentUpdateModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSave,
}) => {
  const [mode, setMode] = useState<'single' | 'installment'>('single');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('khalti');
  const [date, setDate] = useState(todayNPT());
  const [notes, setNotes] = useState('');
  const [installments, setInstallments] = useState<Installment[]>([
    { id: 1, amount: 0, date: todayNPT(), method: 'khalti', notes: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && invoice) {
      setMode('single');
      setAmount('');
      setMethod('khalti');
      setDate(todayNPT());
      setNotes('');
      setInstallments([{ id: 1, amount: 0, date: todayNPT(), method: 'khalti', notes: '' }]);
      setError('');
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const paidAmount = invoice.paidAmount || 0;
  const scheduledAmount = invoice.scheduledAmount || 0;
  const remaining = Math.max(0, invoice.total - paidAmount - scheduledAmount);

  const addInstallment = () => {
    const newId = Math.max(...installments.map(i => i.id)) + 1;
    setInstallments(prev => [...prev, { id: newId, amount: 0, date: todayNPT(), method: 'khalti', notes: '' }]);
  };

  const removeInstallment = (id: number) => {
    if (installments.length > 1) setInstallments(prev => prev.filter(i => i.id !== id));
  };

  const updateInstallment = (id: number, field: keyof Installment, value: any) => {
    setInstallments(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    setError('');
  };

  const totalInstallments = installments.reduce((s, i) => s + (parseFloat(i.amount.toString()) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'single') {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) { setError('Amount must be greater than 0'); return; }
      if (amt > remaining) {
        setError(`Amount (${formatCurrency(amt)}) exceeds remaining balance (${formatCurrency(remaining)})`);
        setAmount(remaining.toFixed(2));
        return;
      }

      setLoading(true);
      try {
        await onSave(invoice._id, { amount: amt, date, method, notes: notes.trim() || undefined });
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to record payment');
      } finally {
        setLoading(false);
      }
    } else {
      if (totalInstallments <= 0) { setError('Total installment amount must be greater than 0'); return; }
      if (totalInstallments > remaining) {
        setError(`Total (${formatCurrency(totalInstallments)}) exceeds remaining balance (${formatCurrency(remaining)})`);
        return;
      }
      for (let i = 0; i < installments.length; i++) {
        const inst = installments[i];
        if (!parseFloat(inst.amount.toString()) || parseFloat(inst.amount.toString()) <= 0) {
          setError(`Installment ${i + 1}: amount must be greater than 0`); return;
        }
        if (!inst.date) { setError(`Installment ${i + 1}: date is required`); return; }
      }

      setLoading(true);
      try {
        // Send all installments in a single atomic request to avoid race conditions
        await onSave(invoice._id, {
          payments: installments.map(inst => ({
            amount: parseFloat(inst.amount.toString()),
            date: inst.date,
            method: inst.method,
            notes: inst.notes.trim() || undefined,
          })),
        });
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to record payments');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
            <p className="text-sm text-gray-500 mt-0.5">{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <XIcon size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Total:</span>
              <span className="font-medium">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paid:</span>
              <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
            </div>
            {scheduledAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Scheduled:</span>
                <span className="font-medium text-blue-600">{formatCurrency(scheduledAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium text-gray-700">Remaining Balance:</span>
              <span className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          {/* Existing payment history */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Payment History</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase">Date (NPT)</th>
                      <th className="px-3 py-2 text-right text-gray-500 uppercase">Amount</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase">Method</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {invoice.payments.map((p, idx) => (
                      <tr key={idx} className={p.status === 'scheduled' ? 'bg-blue-50' : ''}>
                        <td className="px-3 py-2 text-gray-900">
                          {formatNepaliDateTime(p.date, {
                            timeZone: 'Asia/Kathmandu',
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true,
                          })}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{formatMethod(p.method)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {p.status === 'completed' ? 'Completed' : 'Scheduled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {remaining <= 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-green-700 font-medium">
              This invoice is fully paid.
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="flex gap-4">
                {(['single', 'installment'] as const).map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={m}
                      checked={mode === m}
                      onChange={() => setMode(m)}
                      disabled={loading}
                    />
                    <span className="text-sm">{m === 'single' ? 'Single Payment' : 'Installment Payments'}</span>
                  </label>
                ))}
              </div>

              {mode === 'single' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={remaining}
                        value={amount}
                        onChange={e => {
                          const val = e.target.value;
                          const num = parseFloat(val);
                          setError('');
                          if (val === '' || val === '-') { setAmount(''); return; }
                          if (num > remaining) {
                            setAmount(remaining.toFixed(2));
                            setError(`Amount capped at remaining balance (${formatCurrency(remaining)})`);
                          } else {
                            setAmount(val);
                          }
                        }}
                        className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        required
                        disabled={loading}
                      />
                      <p className="text-xs text-gray-400 mt-1">Max: {formatCurrency(remaining)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                      <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg">
                        Khalti
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={loading}
                    />
                    {isFutureDate(date) && (
                      <p className="text-xs text-blue-600 mt-1">Future date — will be recorded as a scheduled payment</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add notes..."
                      disabled={loading}
                    />
                  </div>
                  {/* Quick fill */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAmount(remaining.toFixed(2))}
                      className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded"
                    >
                      Pay Full ({formatCurrency(remaining)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount((remaining / 2).toFixed(2))}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded"
                    >
                      Pay Half ({formatCurrency(remaining / 2)})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Installments</span>
                    <button
                      type="button"
                      onClick={addInstallment}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      disabled={loading}
                    >
                      <PlusIcon size={14} /> Add
                    </button>
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {installments.map((inst, idx) => (
                      <div key={inst.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">#{idx + 1}</span>
                          {installments.length > 1 && (
                            <button type="button" onClick={() => removeInstallment(inst.id)} disabled={loading}>
                              <TrashIcon size={14} className="text-red-400 hover:text-red-600" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Amount</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={inst.amount || ''}
                              onChange={e => {
                                const num = parseFloat(e.target.value) || 0;
                                const otherTotal = installments
                                  .filter(i => i.id !== inst.id)
                                  .reduce((s, i) => s + (parseFloat(i.amount.toString()) || 0), 0);
                                const maxForThis = Math.max(0, remaining - otherTotal);
                                updateInstallment(inst.id, 'amount', Math.min(num, maxForThis));
                                if (num > maxForThis) {
                                  setError(`Installment ${idx + 1} capped — total cannot exceed remaining balance (${formatCurrency(remaining)})`);
                                }
                              }}
                              className="w-full border border-gray-300 rounded py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0.00"
                              disabled={loading}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Date
                              {isFutureDate(inst.date) && <span className="ml-1 text-blue-500">(scheduled)</span>}
                            </label>
                            <input
                              type="date"
                              value={inst.date}
                              onChange={e => updateInstallment(inst.id, 'date', e.target.value)}
                              className="w-full border border-gray-300 rounded py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              disabled={loading}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Method</label>
                            <span className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 rounded">
                              Khalti
                            </span>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Notes</label>
                            <input
                              type="text"
                              value={inst.notes}
                              onChange={e => updateInstallment(inst.id, 'notes', e.target.value)}
                              className="w-full border border-gray-300 rounded py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Optional"
                              disabled={loading}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total installments:</span>
                      <span className={`font-semibold ${totalInstallments > remaining ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(totalInstallments)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining after:</span>
                      <span className={`font-semibold ${remaining - totalInstallments < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(Math.max(0, remaining - totalInstallments))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircleIcon size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            {remaining > 0 && (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Recording...' : mode === 'installment' ? 'Record Installments' : 'Record Payment'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentUpdateModal;
