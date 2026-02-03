import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Layout from '../layout/Layout'
import { salesAPI, invoicesAPI } from '../services/api'
import { Sale } from './Sales/types'
import { transformBackendSaleToFrontend, buildSalesQueryString } from './Sales/utils'
import SalesFilters from './Sales/SalesFilters'
import SalesTable from './Sales/SalesTable'
import PaymentEntryModal from '../components/PaymentEntryModal'

const Sales: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterStatus, setFilterStatus] = useState('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [totalMin, setTotalMin] = useState('')
  const [totalMax, setTotalMax] = useState('')
  const [quantityMin, setQuantityMin] = useState('')
  const [quantityMax, setQuantityMax] = useState('')
  const [expandedSale, setExpandedSale] = useState<string | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  useEffect(() => {
    loadSales()
  }, [searchTerm, sortField, sortDirection, filterStatus, paymentStatusFilter, paymentMethodFilter, customerFilter, dateFrom, dateTo, totalMin, totalMax, quantityMin, quantityMax, pagination.current])

  const loadSales = async () => {
    setIsLoading(true)
    try {
      const queryString = buildSalesQueryString({
        page: pagination.current,
        limit: pagination.limit,
        search: searchTerm,
        status: filterStatus,
        paymentStatus: paymentStatusFilter,
        paymentMethod: paymentMethodFilter,
        customerName: customerFilter,
        dateFrom,
        dateTo,
        totalMin,
        totalMax,
        quantityMin,
        quantityMax,
        sortBy: sortField,
        sortOrder: sortDirection,
      })

      const response = await salesAPI.getAll(queryString)
      
      // Handle both old and new API response formats
      if (response.sales) {
        // New paginated format
        const transformedSales = response.sales.map(transformBackendSaleToFrontend)
        setSales(transformedSales)
        setPagination(response.pagination)
      } else {
        // Old format (fallback)
        const transformedSales = response.map(transformBackendSaleToFrontend)
        setSales(transformedSales)
        setPagination({
          current: 1,
          pages: 1,
          total: transformedSales.length,
          limit: transformedSales.length,
        })
      }
    } catch (error: any) {
      console.error('Failed to load sales:', error)
      toast.error('Failed to load sales', {
        description:
          error?.message ||
          'Check that the backend server is running and reachable.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleExpandSale = (id: string | null) => {
    setExpandedSale(expandedSale === id ? null : id)
  }

  const handleRecordPayment = (sale: Sale) => {
    setSelectedSale(sale)
    setShowPaymentModal(true)
  }

  const handleSavePayment = async (paymentData: { amount: number; date: string; method: string; notes?: string }) => {
    if (!selectedSale?._id) {
      toast.error('No sale selected')
      return
    }

    try {
      const updatedSale = await salesAPI.recordPayment(selectedSale._id, paymentData)
      const transformedSale = transformBackendSaleToFrontend(updatedSale)
      
      // Update the sale in the list
      setSales((prevSales) =>
        prevSales.map((sale) => (sale._id === selectedSale._id ? transformedSale : sale))
      )
      
      // Reload to ensure consistency
      await loadSales()
    } catch (error: any) {
      throw error // Let the modal handle the error display
    }
  }

  const handleViewInvoice = async (saleId: string) => {
    try {
      // Find the invoice related to this sale
      const response = await invoicesAPI.getAll(`relatedId=${saleId}&type=sale`)
      
      if (response.invoices && response.invoices.length > 0) {
        const invoice = response.invoices[0]
        // Navigate directly to the individual invoice detail page
        navigate(`/invoices/${invoice._id}`)
      } else {
        toast.error('No invoice found for this sale')
      }
    } catch (error: any) {
      console.error('Error finding invoice:', error)
      toast.error('Failed to find invoice for this sale')
    }
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current: page }))
  }

  const customers = useMemo(
    () => Array.from(new Set(sales.map((s) => s.customer.name))).sort(),
    [sales],
  )

  const clearFilters = () => {
    setFilterStatus('all')
    setPaymentStatusFilter('all')
    setPaymentMethodFilter('all')
    setCustomerFilter('all')
    setDateFrom('')
    setDateTo('')
    setTotalMin('')
    setTotalMax('')
    setQuantityMin('')
    setQuantityMax('')
    setSearchTerm('')
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Sales</h1>
        </div>
        <div className="bg-white rounded-lg shadow-sm">
          <SalesFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            paymentStatusFilter={paymentStatusFilter}
            onPaymentStatusChange={setPaymentStatusFilter}
            paymentMethodFilter={paymentMethodFilter}
            onPaymentMethodChange={setPaymentMethodFilter}
            customerFilter={customerFilter}
            onCustomerChange={setCustomerFilter}
            customers={customers}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            totalMin={totalMin}
            onTotalMinChange={setTotalMin}
            totalMax={totalMax}
            onTotalMaxChange={setTotalMax}
            quantityMin={quantityMin}
            onQuantityMinChange={setQuantityMin}
            quantityMax={quantityMax}
            onQuantityMaxChange={setQuantityMax}
            onClearFilters={clearFilters}
          />
          <SalesTable
            sales={sales}
            sortField={sortField}
            sortDirection={sortDirection}
            expandedSale={expandedSale}
            onSort={handleSort}
            onToggleExpand={toggleExpandSale}
            onRecordPayment={handleRecordPayment}
            onViewInvoice={handleViewInvoice}
          />
          {isLoading && (
            <div className="p-6 text-center text-gray-500">
              Loading sales...
            </div>
          )}
          {sales.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                No sales found matching your criteria.
              </p>
            </div>
          )}
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6 p-4 border-t">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.current * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
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
            </div>
          )}
        </div>
        {selectedSale && (
          <PaymentEntryModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false)
              setSelectedSale(null)
            }}
            onSave={handleSavePayment}
            totalAmount={selectedSale.total}
            paidAmount={selectedSale.paidAmount || 0}
            title={`Record Payment - ${selectedSale.invoiceNumber || selectedSale.id}`}
            paymentMethods={['cash', 'card', 'bank_transfer', 'other']}
          />
        )}
      </div>
    </Layout>
  )
}

export default Sales
