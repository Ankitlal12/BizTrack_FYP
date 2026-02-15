import React from 'react'
import TransactionFilters from './TransactionHistory/TransactionFilters'
import TransactionTable from './TransactionHistory/TransactionTable'
import { useTransactions } from './TransactionHistory/useTransaction'
import Layout from '../layout/Layout'

const TransactionHistory = () => {
  const {
    transactions,
    pagination,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    totalMin,
    setTotalMin,
    totalMax,
    setTotalMax,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    expandedId,
    toggleExpanded,
    isLoading,
    error,
    loadTransactions,
    handlePageChange,
    handleLimitChange,
    handleSort,
    clearFilters,
  } = useTransactions()

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Transaction History</h1>
        <div className="text-sm text-gray-500">
          Combined sales and purchases with date and weekday.
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <TransactionFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterType={filterType}
          onFilterChange={setFilterType}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          totalMin={totalMin}
          onTotalMinChange={setTotalMin}
          totalMax={totalMax}
          onTotalMaxChange={setTotalMax}
          sortField={sortField}
          onSortFieldChange={setSortField}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          onRefresh={loadTransactions}
          onClearFilters={clearFilters}
          isRefreshing={isLoading}
        />

        {error && (
          <div className="px-5 py-3 text-sm text-red-600 border-b border-red-100 bg-red-50">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="px-5 py-4 text-sm text-gray-500 border-b">Loading transactions...</div>
        )}

        {!isLoading && (
          <>
            <TransactionTable
              transactions={transactions}
              sortField={sortField}
              sortDirection={sortDirection}
              expandedId={expandedId}
              onToggle={toggleExpanded}
              onSort={handleSort}
            />

            {transactions.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-gray-500">No transactions found matching your criteria.</p>
              </div>
            )}

            {/* Pagination */}
            {pagination.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.current - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.current * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Per page:</label>
                    <select
                      value={pagination.limit}
                      onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                {pagination.pages > 1 && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.current - 1)}
                      disabled={pagination.current === 1}
                      className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {[...Array(pagination.pages)].map((_, index) => {
                      const page = index + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 text-sm rounded-md ${
                            page === pagination.current
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => handlePageChange(pagination.current + 1)}
                      disabled={pagination.current === pagination.pages}
                      className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </Layout>
  )
}

export default TransactionHistory
