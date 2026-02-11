import React, { useState, useEffect } from 'react';
import { X, DollarSign, ShoppingCart, TrendingUp, AlertCircle, Calendar, Package, CreditCard, FileText } from 'lucide-react';
import { suppliersAPI, invoicesAPI } from '../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SupplierPurchaseHistoryModalProps {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
}

interface Purchase {
  _id: string;
  purchaseNumber: string;
  supplierName: string;
  items: Array<{
    inventoryId: { name: string; sku: string };
    name: string;
    quantity: number;
    cost: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
  paidAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  status: string;
  createdAt: string;
  payments?: Array<{
    amount: number;
    date: string;
    method: string;
    notes?: string;
  }>;
}

interface FinancialSummary {
  totalPurchased: number;
  totalPaid: number;
  totalOutstanding: number;
  purchaseCount: number;
  paidPurchases: number;
  partialPurchases: number;
  unpaidPurchases: number;
}

const SupplierPurchaseHistoryModal: React.FC<SupplierPurchaseHistoryModalProps> = ({
  supplierId,
  supplierName,
  onClose,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);

  useEffect(() => {
    loadPurchaseHistory();
  }, [supplierId, page]);

  const loadPurchaseHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');

      const response = await suppliersAPI.getPurchaseHistory(supplierId, params.toString());
      setPurchases(response.data.purchases);
      setFinancialSummary(response.data.financialSummary);
      setTotalPages(response.data.pagination.pages);
    } catch (error: any) {
      console.error('Error loading purchase history:', error);
      toast.error('Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toFixed(2)}`;
  };

  const handleViewInvoice = async (purchaseId: string) => {
    try {
      // Find the invoice for this purchase
      const response = await invoicesAPI.getAll(`relatedId=${purchaseId}&type=purchase`);
      
      if (response.invoices && response.invoices.length > 0) {
        const invoice = response.invoices[0];
        // Close the modal and navigate to invoice
        onClose();
        navigate(`/invoices/${invoice._id}`);
      } else {
        toast.error('Invoice not found for this purchase');
      }
    } catch (error: any) {
      console.error('Error finding invoice:', error);
      toast.error('Failed to load invoice');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-teal-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Purchase History</h2>
            <p className="text-sm text-gray-600 mt-1">{supplierName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Financial Summary */}
        {financialSummary && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Total Purchased */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Purchased</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(financialSummary.totalPurchased)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {financialSummary.purchaseCount} purchase(s)
                </p>
              </div>

              {/* Total Paid */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {formatCurrency(financialSummary.totalPaid)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {financialSummary.paidPurchases} fully paid
                </p>
              </div>

              {/* Outstanding */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Outstanding</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {formatCurrency(financialSummary.totalOutstanding)}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {financialSummary.unpaidPurchases + financialSummary.partialPurchases} pending
                </p>
              </div>

              {/* Payment Status */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Paid:</span>
                    <span className="font-medium">{financialSummary.paidPurchases}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-yellow-600">Partial:</span>
                    <span className="font-medium">{financialSummary.partialPurchases}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-red-600">Unpaid:</span>
                    <span className="font-medium">{financialSummary.unpaidPurchases}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No purchase history found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.map((purchase) => (
                <div
                  key={purchase._id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Purchase Header */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() =>
                      setExpandedPurchase(
                        expandedPurchase === purchase._id ? null : purchase._id
                      )
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {purchase.purchaseNumber}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(
                              purchase.paymentStatus
                            )}`}
                          >
                            {purchase.paymentStatus.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(purchase.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            <span>{purchase.items.length} item(s)</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(purchase.total)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Paid: {formatCurrency(purchase.paidAmount)}
                        </p>
                        {purchase.paidAmount < purchase.total && (
                          <p className="text-sm text-red-600 font-medium">
                            Due: {formatCurrency(purchase.total - purchase.paidAmount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedPurchase === purchase._id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {/* Items */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Items</h4>
                        <div className="space-y-2">
                          {purchase.items.map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center bg-white p-3 rounded border border-gray-200"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{item.name}</p>
                                <p className="text-xs text-gray-500">
                                  SKU: {item.inventoryId?.sku || 'N/A'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">
                                  {item.quantity} × {formatCurrency(item.cost)}
                                </p>
                                <p className="font-medium text-gray-900">
                                  {formatCurrency(item.total)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment History */}
                      {purchase.payments && purchase.payments.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Payment History
                          </h4>
                          <div className="space-y-2">
                            {purchase.payments.map((payment, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center bg-white p-3 rounded border border-gray-200"
                              >
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {formatCurrency(payment.amount)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(payment.date)} • {payment.method}
                                  </p>
                                  {payment.notes && (
                                    <p className="text-xs text-gray-600 mt-1">{payment.notes}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* View Invoice Button */}
                      <div>
                        <button
                          onClick={() => handleViewInvoice(purchase._id)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <FileText className="w-5 h-5" />
                          View Invoice
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierPurchaseHistoryModal;
