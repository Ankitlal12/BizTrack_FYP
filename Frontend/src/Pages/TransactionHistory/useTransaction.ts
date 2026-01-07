import { useEffect, useMemo, useState } from 'react'
import { transactionsAPI } from '../../services/api'
import { Transaction, TransactionType } from './types'

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTransactions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await transactionsAPI.getAll()
      setTransactions(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false
      if (!searchTerm) return true
      const haystack = [
        tx.id,
        tx.reference || '',
        tx.counterpartName || '',
        tx.itemSummary || '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(searchTerm.toLowerCase())
    })
  }, [transactions, filterType, searchTerm])

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return {
    transactions,
    filteredTransactions,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    expandedId,
    toggleExpanded,
    isLoading,
    error,
    loadTransactions,
  }
}

