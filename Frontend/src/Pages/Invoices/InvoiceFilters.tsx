import React, { useState } from 'react';
import { InvoiceFilters as IInvoiceFilters } from './types';

interface InvoiceFiltersProps {
  filters: IInvoiceFilters;
  onFiltersChange: (filters: IInvoiceFilters) => void;
  onReset: () => void;
}

const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof IInvoiceFilters, value: string | number) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1, // Reset to first page when filters change
    });
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            placeholder="Invoice number, customer..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="sale">Sales Invoice</option>
            <option value="purchase">Purchase Invoice</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="partial">Partially Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Payment Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Status
          </label>
          <select
            value={filters.paymentStatus || ''}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Payment Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="mt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
        >
          {showAdvanced ? '▼' : '▶'} Advanced Filters
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Payment Method Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={filters.paymentMethod || ''}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit">Credit</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Generated From Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generated From
              </label>
              <select
                value={filters.generatedFrom || ''}
                onChange={(e) => handleFilterChange('generatedFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sources</option>
                <option value="sale">From Sale</option>
                <option value="purchase">From Purchase</option>
                <option value="manual">Manual Entry</option>
              </select>
            </div>

            {/* Auto Generated Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto Generated
              </label>
              <select
                value={filters.autoGenerated || ''}
                onChange={(e) => handleFilterChange('autoGenerated', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="true">Auto Generated</option>
                <option value="false">Manual</option>
              </select>
            </div>

            {/* Customer Name Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                placeholder="Customer name..."
                value={filters.customerName || ''}
                onChange={(e) => handleFilterChange('customerName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Created By Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created By
              </label>
              <input
                type="text"
                placeholder="Creator name..."
                value={filters.createdBy || ''}
                onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy || ''}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Default</option>
                <option value="createdAt">Created Date</option>
                <option value="dueDate">Due Date</option>
                <option value="total">Amount</option>
                <option value="invoiceNumber">Invoice Number</option>
              </select>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {/* Issue Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date From
              </label>
              <input
                type="date"
                value={formatDateForInput(filters.dateFrom)}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date To
              </label>
              <input
                type="date"
                value={formatDateForInput(filters.dateTo)}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Due Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date From
              </label>
              <input
                type="date"
                value={formatDateForInput(filters.dueDateFrom)}
                onChange={(e) => handleFilterChange('dueDateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date To
              </label>
              <input
                type="date"
                value={formatDateForInput(filters.dueDateTo)}
                onChange={(e) => handleFilterChange('dueDateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Amount Range Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount From (Rs)
              </label>
              <input
                type="number"
                placeholder="0"
                value={filters.amountFrom || ''}
                onChange={(e) => handleFilterChange('amountFrom', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount To (Rs)
              </label>
              <input
                type="number"
                placeholder="999999"
                value={filters.amountTo || ''}
                onChange={(e) => handleFilterChange('amountTo', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <select
                value={filters.sortOrder || ''}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Default</option>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end mt-4 space-x-2">
        <button
          onClick={onReset}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Reset Filters
        </button>
        {showAdvanced && (
          <button
            onClick={() => setShowAdvanced(false)}
            className="px-4 py-2 text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            Hide Advanced
          </button>
        )}
      </div>
    </div>
  );
};

export default InvoiceFilters;