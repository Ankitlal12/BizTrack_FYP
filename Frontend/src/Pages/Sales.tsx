import React, { useEffect, useState, useMemo } from 'react'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import Layout from '../layout/Layout'
import { salesAPI } from '../services/api'
import { Sale } from './Sales/types'
import { transformBackendSaleToFrontend, filterAndSortSales } from './Sales/utils'
import SalesFilters from './Sales/SalesFilters'
import SalesTable from './Sales/SalesTable'
import NewSaleModal from './Sales/NewSaleModel'

const Sales: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
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
  const [showNewSaleModal, setShowNewSaleModal] = useState(false)
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadSales()
  }, [])

  const loadSales = async () => {
    setIsLoading(true)
    try {
      const data = await salesAPI.getAll()
      // Transform backend data to frontend format
      const transformedSales = data.map(transformBackendSaleToFrontend)
      setSales(transformedSales)
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

  const handleAddSale = async (newSale: any) => {
    try {
      // Reload sales from backend to get the latest data
      await loadSales()
      toast.success('Sale added successfully')
    } catch (error: any) {
      console.error('Failed to refresh sales:', error)
    }
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
  }

  const filteredSales = useMemo(() => {
    return filterAndSortSales(
      sales,
      searchTerm,
      filterStatus,
      paymentStatusFilter,
      paymentMethodFilter,
      customerFilter,
      dateFrom,
      dateTo,
      totalMin,
      totalMax,
      quantityMin,
      quantityMax,
      sortField,
      sortDirection
    )
  }, [
    sales,
    searchTerm,
    filterStatus,
    paymentStatusFilter,
    paymentMethodFilter,
    customerFilter,
    dateFrom,
    dateTo,
    totalMin,
    totalMax,
    quantityMin,
    quantityMax,
    sortField,
    sortDirection,
  ])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Sales</h1>
          <button
            className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg flex items-center"
            onClick={() => setShowNewSaleModal(true)}
          >
            <PlusIcon size={18} className="mr-1" />
            New Sale
          </button>
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
            sales={filteredSales}
            sortField={sortField}
            sortDirection={sortDirection}
            expandedSale={expandedSale}
            onSort={handleSort}
            onToggleExpand={toggleExpandSale}
          />
          {isLoading && (
            <div className="p-6 text-center text-gray-500">
              Loading sales...
            </div>
          )}
          {filteredSales.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                No sales found matching your criteria.
              </p>
            </div>
          )}
          <div className="p-4 border-t">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Showing{' '}
                <span className="font-medium">{filteredSales.length}</span> of{' '}
                <span className="font-medium">{sales.length}</span> sales
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
        </div>
        <NewSaleModal
          isOpen={showNewSaleModal}
          onClose={() => setShowNewSaleModal(false)}
          onSave={handleAddSale}
        />
      </div>
    </Layout>
  )
}

export default Sales
