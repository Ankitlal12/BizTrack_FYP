import { Sale } from './types'

export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'processing':
      return 'bg-blue-100 text-blue-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const getPaymentStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800'
    case 'unpaid':
      return 'bg-red-100 text-red-800'
    case 'partial':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const formatPaymentMethod = (method: string): string => {
  switch (method) {
    case 'credit_card':
    case 'card':
      return 'Credit Card'
    case 'bank_transfer':
      return 'Bank Transfer'
    case 'cash':
      return 'Cash'
    case 'other':
      return 'Other'
    default:
      return method ? method.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'N/A'
  }
}

export const getSaleKey = (sale: Sale): string => {
  return sale.id || sale._id || sale.invoiceNumber || ''
}

export const transformBackendSaleToFrontend = (sale: any): Sale => {
  return {
    id: sale.invoiceNumber || sale._id,
    _id: sale._id,
    invoiceNumber: sale.invoiceNumber,
    customer: {
      name: sale.customerName || '',
      email: sale.customerEmail || '',
      phone: sale.customerPhone || '',
    },
    items: sale.items || [],
    date: sale.createdAt ? new Date(sale.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    subtotal: sale.subtotal || 0,
    tax: sale.tax || 0,
    total: sale.total || 0,
    status: sale.status || 'pending',
    paymentStatus: sale.paymentMethod === 'cash' ? 'paid' : 'unpaid',
    paymentMethod: sale.paymentMethod || 'cash',
    notes: sale.notes || '',
  }
}

export const filterAndSortSales = (
  sales: Sale[],
  searchTerm: string,
  filterStatus: string,
  paymentStatusFilter: string,
  paymentMethodFilter: string,
  customerFilter: string,
  dateFrom: string,
  dateTo: string,
  totalMin: string,
  totalMax: string,
  quantityMin: string,
  quantityMax: string,
  sortField: string,
  sortDirection: 'asc' | 'desc'
): Sale[] => {
  return [...sales]
    .filter((sale) => {
      // Search filter
      if (
        searchTerm &&
        !sale.id.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(sale.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false
      }

      // Status filter
      if (filterStatus !== 'all' && sale.status !== filterStatus) {
        return false
      }

      // Payment Status filter
      if (paymentStatusFilter !== 'all' && sale.paymentStatus !== paymentStatusFilter) {
        return false
      }

      // Payment Method filter
      if (paymentMethodFilter !== 'all' && sale.paymentMethod !== paymentMethodFilter) {
        return false
      }

      // Customer filter
      if (customerFilter !== 'all' && sale.customer.name !== customerFilter) {
        return false
      }

      // Date range filter
      const saleDate = new Date(sale.date)
      if (dateFrom && saleDate < new Date(dateFrom)) {
        return false
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999) // Include the entire end date
        if (saleDate > toDate) {
          return false
        }
      }

      // Total range filter
      if (totalMin !== '') {
        const min = parseFloat(totalMin)
        if (!isNaN(min) && sale.total < min) {
          return false
        }
      }
      if (totalMax !== '') {
        const max = parseFloat(totalMax)
        if (!isNaN(max) && sale.total > max) {
          return false
        }
      }

      // Quantity range filter (total items quantity)
      const totalQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0)
      if (quantityMin !== '') {
        const min = parseFloat(quantityMin)
        if (!isNaN(min) && totalQuantity < min) {
          return false
        }
      }
      if (quantityMax !== '') {
        const max = parseFloat(quantityMax)
        if (!isNaN(max) && totalQuantity > max) {
          return false
        }
      }

      return true
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'id':
          comparison = a.id.localeCompare(b.id)
          break
        case 'customer':
          comparison = a.customer.name.localeCompare(b.customer.name)
          break
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'total':
          comparison = a.total - b.total
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        default:
          comparison = 0
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
}

