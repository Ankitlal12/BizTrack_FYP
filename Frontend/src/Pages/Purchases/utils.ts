import { Purchase } from './types'

export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'received':
      return 'bg-green-100 text-green-800'
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

export const getPurchaseDate = (purchase: Purchase): string => {
  const dateValue = purchase.expectedDeliveryDate || purchase.createdAt
  return dateValue ? new Date(dateValue).toLocaleDateString() : 'N/A'
}

export const getPurchaseKey = (purchase: Purchase): string => {
  return purchase._id || purchase.purchaseNumber
}

export const filterAndSortPurchases = (
  purchases: Purchase[],
  searchTerm: string,
  filterStatus: string,
  paymentStatusFilter: string,
  paymentMethodFilter: string,
  supplierFilter: string,
  dateFrom: string,
  dateTo: string,
  totalMin: string,
  totalMax: string,
  quantityMin: string,
  quantityMax: string,
  sortField: string,
  sortDirection: 'asc' | 'desc'
): Purchase[] => {
  return [...purchases]
    .filter((purchase) => {
      // Search filter
      if (
        searchTerm &&
        !purchase.purchaseNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) &&
        !purchase.supplierName
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ) {
        return false
      }

      // Status filter
      if (filterStatus !== 'all' && purchase.status !== filterStatus) {
        return false
      }

      // Payment Status filter
      if (paymentStatusFilter !== 'all') {
        const purchasePaymentStatus = purchase.paymentStatus || 'unpaid'
        if (purchasePaymentStatus !== paymentStatusFilter) {
          return false
        }
      }

      // Payment Method filter
      if (paymentMethodFilter !== 'all' && purchase.paymentMethod !== paymentMethodFilter) {
        return false
      }

      // Supplier filter
      if (supplierFilter !== 'all' && purchase.supplierName !== supplierFilter) {
        return false
      }

      // Date range filter
      const purchaseDate = new Date(purchase.expectedDeliveryDate || purchase.createdAt || '')
      if (dateFrom && purchaseDate < new Date(dateFrom)) {
        return false
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999) // Include the entire end date
        if (purchaseDate > toDate) {
          return false
        }
      }

      // Total range filter
      if (totalMin !== '') {
        const min = parseFloat(totalMin)
        if (!isNaN(min) && purchase.total < min) {
          return false
        }
      }
      if (totalMax !== '') {
        const max = parseFloat(totalMax)
        if (!isNaN(max) && purchase.total > max) {
          return false
        }
      }

      // Quantity range filter (total items quantity)
      const totalQuantity = purchase.items.reduce((sum, item) => sum + item.quantity, 0)
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
          comparison = a.purchaseNumber.localeCompare(b.purchaseNumber)
          break
        case 'supplier':
          comparison = a.supplierName.localeCompare(b.supplierName)
          break
        case 'date':
          const dateA =
            new Date(a.expectedDeliveryDate || a.createdAt || '').getTime() ||
            0
          const dateB =
            new Date(b.expectedDeliveryDate || b.createdAt || '').getTime() ||
            0
          comparison = dateA - dateB
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


