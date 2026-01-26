import { Sale } from './types'

export const transformBackendSaleToFrontend = (backendSale: any): Sale => {
  return {
    _id: backendSale._id,
    id: backendSale.invoiceNumber || backendSale._id,
    invoiceNumber: backendSale.invoiceNumber,
    customer: {
      name: backendSale.customerName || backendSale.customer?.name || 'Unknown Customer',
      email: backendSale.customerEmail || backendSale.customer?.email || '',
      phone: backendSale.customerPhone || backendSale.customer?.phone || '',
    },
    items: backendSale.items?.map((item: any) => ({
      _id: item._id,
      id: item.id || item._id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
      inventoryId: item.inventoryId,
    })) || [],
    subtotal: backendSale.subtotal || 0,
    tax: backendSale.tax || 0,
    total: backendSale.total,
    status: backendSale.status || 'pending',
    paymentStatus: backendSale.paymentStatus || 'unpaid',
    paymentMethod: backendSale.paymentMethod || 'cash',
    paidAmount: backendSale.paidAmount || 0,
    date: backendSale.createdAt || backendSale.date,
    notes: backendSale.notes || '',
    payments: backendSale.payments || [],
    createdBy: backendSale.createdBy,
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
  let filtered = sales.filter((sale) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        sale.id.toLowerCase().includes(searchLower) ||
        sale.customer.name.toLowerCase().includes(searchLower) ||
        (sale.customer.email?.toLowerCase().includes(searchLower) ?? false) ||
        sale.items.some((item) => item.name.toLowerCase().includes(searchLower))
      if (!matchesSearch) return false
    }

    // Status filter
    if (filterStatus !== 'all' && sale.status !== filterStatus) return false

    // Payment status filter
    if (paymentStatusFilter !== 'all' && sale.paymentStatus !== paymentStatusFilter) return false

    // Payment method filter
    if (paymentMethodFilter !== 'all' && sale.paymentMethod !== paymentMethodFilter) return false

    // Customer filter
    if (customerFilter !== 'all' && sale.customer.name !== customerFilter) return false

    // Date range filter
    if (dateFrom || dateTo) {
      const saleDate = new Date(sale.date)
      if (dateFrom && saleDate < new Date(dateFrom)) return false
      if (dateTo && saleDate > new Date(dateTo + 'T23:59:59')) return false
    }

    // Total amount range filter
    if (totalMin && sale.total < parseFloat(totalMin)) return false
    if (totalMax && sale.total > parseFloat(totalMax)) return false

    // Quantity range filter
    if (quantityMin || quantityMax) {
      const totalQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0)
      if (quantityMin && totalQuantity < parseInt(quantityMin)) return false
      if (quantityMax && totalQuantity > parseInt(quantityMax)) return false
    }

    return true
  })

  // Sort
  filtered.sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case 'id':
        aValue = a.id
        bValue = b.id
        break
      case 'customer':
        aValue = a.customer.name
        bValue = b.customer.name
        break
      case 'date':
        aValue = new Date(a.date)
        bValue = new Date(b.date)
        break
      case 'total':
        aValue = a.total
        bValue = b.total
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'paymentStatus':
        aValue = a.paymentStatus
        bValue = b.paymentStatus
        break
      default:
        aValue = new Date(a.date)
        bValue = new Date(b.date)
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return filtered
}

export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const getPaymentStatusBadgeClass = (paymentStatus: string): string => {
  switch (paymentStatus) {
    case 'paid':
      return 'bg-green-100 text-green-800'
    case 'partial':
      return 'bg-yellow-100 text-yellow-800'
    case 'unpaid':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const getSaleKey = (sale: Sale): string => {
  return sale._id || sale.id
}

export const formatPaymentMethod = (method: string): string => {
  return method
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Build query string for API requests
export const buildSalesQueryString = (filters: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  customerName?: string;
  dateFrom?: string;
  dateTo?: string;
  totalMin?: string;
  totalMax?: string;
  quantityMin?: string;
  quantityMax?: string;
  sortBy?: string;
  sortOrder?: string;
}): string => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      params.append(key, value.toString());
    }
  });
  
  return params.toString();
};