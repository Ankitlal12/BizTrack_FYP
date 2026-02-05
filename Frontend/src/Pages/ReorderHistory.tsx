import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import Layout from '../layout/Layout';
import { reorderAPI } from '../services/api';
import { Reorder, ReorderFilters } from './LowStock/types';
import { 
  RotateCcw, 
  Filter, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  ShoppingCart,
  Package,
  Calendar
} from 'lucide-react';

const ReorderHistory: React.FC = () => {
  const [reorders, setReorders] = useState<Reorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReorderFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const loadReorders = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('page', page.toString());
      params.append('limit', '10');

      const response = await reorderAPI.getAll(params.toString());
      setReorders(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (error: any) {
      console.error('Error loading reorders:', error);
      toast.error('Failed to load reorder history');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadReorders();
  }, [loadReorders]);

  const handleApprove = async (reorder: Reorder) => {
    try {
      await reorderAPI.approve(reorder._id);
      toast.success('Reorder approved successfully');
      loadReorders();
    } catch (error: any) {
      console.error('Error approving reorder:', error);
      toast.error(error.message || 'Failed to approve reorder');
    }
  };

  const handleCancel = async (reorder: Reorder) => {
    if (!confirm('Are you sure you want to cancel this reorder?')) {
      return;
    }

    try {
      await reorderAPI.cancel(reorder._id);
      toast.success('Reorder cancelled successfully');
      loadReorders();
    } catch (error: any) {
      console.error('Error cancelling reorder:', error);
      toast.error(error.message || 'Failed to cancel reorder');
    }
  };

  const handleCreatePurchase = async (reorder: Reorder) => {
    try {
      await reorderAPI.createPurchase(reorder._id, {
        quantity: reorder.suggestedQuantity,
        notes: `Purchase order created from reorder #${reorder._id}`
      });
      toast.success('Purchase order created successfully');
      loadReorders();
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      toast.error(error.message || 'Failed to create purchase order');
    }
  };

  const toggleRowExpansion = (reorderId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(reorderId)) {
      newExpanded.delete(reorderId);
    } else {
      newExpanded.add(reorderId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'ordered': return 'bg-purple-100 text-purple-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'ordered': return <ShoppingCart className="w-4 h-4" />;
      case 'received': return <Package className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTriggerTypeColor = (type: string) => {
    switch (type) {
      case 'auto': return 'bg-green-100 text-green-800';
      case 'manual': return 'bg-blue-100 text-blue-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && reorders.length === 0) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reorder History</h1>
            <p className="text-gray-600">Track and manage all reorder requests and their status</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <select
                value={filters.status || 'all'}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="ordered">Ordered</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="From date"
              />

              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="To date"
              />

              <button
                onClick={() => {
                  setFilters({});
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Reorders Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Product</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Quantity</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Supplier</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Trigger</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reorders.map((reorder) => (
                  <React.Fragment key={reorder._id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{reorder.inventoryId.name}</p>
                          <p className="text-sm text-gray-500">SKU: {reorder.inventoryId.sku}</p>
                          <p className="text-sm text-gray-500">{reorder.inventoryId.category}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{reorder.suggestedQuantity}</p>
                          <p className="text-sm text-gray-500">Stock: {reorder.stockAtTrigger}</p>
                          <p className="text-sm text-gray-500">Reorder: {reorder.reorderLevel}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {reorder.supplierId ? (
                          <div>
                            <p className="text-sm text-gray-900">{reorder.supplierId.name}</p>
                            {reorder.supplierId.contactPerson && (
                              <p className="text-sm text-gray-500">{reorder.supplierId.contactPerson}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No supplier</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(reorder.status)}`}>
                            {getStatusIcon(reorder.status)}
                            {reorder.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTriggerTypeColor(reorder.triggerType)}`}>
                          {reorder.triggerType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-gray-900">{formatDate(reorder.triggeredAt)}</p>
                          <p className="text-sm text-gray-500">by {reorder.triggeredBy.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleRowExpansion(reorder._id)}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {reorder.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(reorder)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          
                          {reorder.status === 'approved' && (
                            <button
                              onClick={() => handleCreatePurchase(reorder)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Create Purchase Order"
                            >
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                          )}
                          
                          {['pending', 'approved'].includes(reorder.status) && (
                            <button
                              onClick={() => handleCancel(reorder)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Row Details */}
                    {expandedRows.has(reorder._id) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Reorder Details</h4>
                              <div className="space-y-1">
                                <p><span className="text-gray-600">Reorder ID:</span> {reorder._id}</p>
                                <p><span className="text-gray-600">Trigger Type:</span> {reorder.triggerType}</p>
                                <p><span className="text-gray-600">Stock at Trigger:</span> {reorder.stockAtTrigger}</p>
                                <p><span className="text-gray-600">Reorder Level:</span> {reorder.reorderLevel}</p>
                              </div>
                            </div>
                            
                            {reorder.purchaseOrderId && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Purchase Order</h4>
                                <div className="space-y-1">
                                  <p><span className="text-gray-600">PO Number:</span> {reorder.purchaseOrderId.purchaseNumber}</p>
                                  <p><span className="text-gray-600">PO Status:</span> {reorder.purchaseOrderId.status}</p>
                                  {reorder.orderedQuantity && (
                                    <p><span className="text-gray-600">Ordered Qty:</span> {reorder.orderedQuantity}</p>
                                  )}
                                  {reorder.receivedQuantity && (
                                    <p><span className="text-gray-600">Received Qty:</span> {reorder.receivedQuantity}</p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {(reorder.resolvedAt || reorder.notes) && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Additional Info</h4>
                                <div className="space-y-1">
                                  {reorder.resolvedAt && (
                                    <p><span className="text-gray-600">Resolved:</span> {formatDate(reorder.resolvedAt)}</p>
                                  )}
                                  {reorder.resolvedBy && (
                                    <p><span className="text-gray-600">Resolved By:</span> {reorder.resolvedBy.name}</p>
                                  )}
                                  {reorder.notes && (
                                    <p><span className="text-gray-600">Notes:</span> {reorder.notes}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {reorders.length === 0 && !loading && (
            <div className="text-center py-12">
              <RotateCcw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reorder history found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReorderHistory;