import { useEffect, useMemo, useState } from 'react'
import { transactionsAPI } from '../../services/api'
import { Transaction, TransactionType } from './types'
import { buildTransactionsQueryString } from './utils'

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [totalMin, setTotalMin] = useState('')
  const [totalMax, setTotalMax] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTransactions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const queryString = buildTransactionsQueryString({
        page: pagination.current,
        limit: pagination.limit,
        search: searchTerm,
        type: filterType,
        dateFrom,
        dateTo,
        totalMin,
        totalMax,
        sortBy: sortField,
        sortOrder: sortDirection,
      })

      const response = await transactionsAPI.getAll(queryString)
      
      // Handle both old and new API response formats
      if (response.transactions) {
        // New paginated format
        setTransactions(response.transactions)
        setPagination(response.pagination)
      } else {
        // Old format (fallback)
        setTransactions(response)
        setPagination({
          current: 1,
          pages: 1,
          total: response.length,
          limit: response.length,
        })
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [searchTerm, filterType, dateFrom, dateTo, totalMin, totalMax, sortField, sortDirection, pagination.current])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current: page }))
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const clearFilters = () => {
    setFilterType('all')
    setDateFrom('')
    setDateTo('')
    setTotalMin('')
    setTotalMax('')
    setSearchTerm('')
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return {
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
    sortDirection,
    expandedId,
    toggleExpanded,
    isLoading,
    error,
    loadTransactions,
    handlePageChange,
    handleSort,
    clearFilters,
  }
}

