import React from 'react'
import TransactionFilters from './TransactionHistory/TransactionFilters'
import TransactionTable from './TransactionHistory/TransactionTable'
import { useTransactions } from './TransactionHistory/useTransaction'
import Layout from '../layout/Layout'

const TransactionHistory = () => {
  const {
    filteredTransactions,
    transactions,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    expandedId,
    toggleExpanded,
    isLoading,
    error,
    loadTransactions,
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
          onRefresh={loadTransactions}
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
              transactions={filteredTransactions}
              expandedId={expandedId}
              onToggle={toggleExpanded}
            />

            {filteredTransactions.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-gray-500">No transactions found matching your criteria.</p>
              </div>
            )}

            <div className="p-4 border-t">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Showing <span className="font-medium">{filteredTransactions.length}</span> of{' '}
                  <span className="font-medium">{transactions.length}</span> transactions
                </div>
                <div className="flex space-x-1">
                  <button className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50">
                    Previous
                  </button>
                  <button className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50">
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </Layout>
  )
}

export default TransactionHistory
