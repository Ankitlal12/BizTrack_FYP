export type InventoryItem = {
  _id?: string
  id?: string | number
  name: string
  sku: string
  category: string
  price: number
  cost: number
  stock: number
  reorderLevel: number
  reorderQuantity?: number
  maximumStock?: number
  preferredSupplierId?: string
  supplierProductCode?: string
  lastPurchasePrice?: number
  reorderStatus?: 'none' | 'needed' | 'pending' | 'ordered'
  pendingOrderId?: string
  lastReorderDate?: string | Date
  averageDailySales?: number
  leadTimeDays?: number
  safetyStock?: number
  autoReorderEnabled?: boolean
  supplier: string
  location: string
  lastUpdated?: string | Date
}

export type InventoryStatus = 'out-of-stock' | 'critical' | 'high' | 'low' | 'in-stock'
export type StockPriority = 'critical' | 'high' | 'low' | 'normal'

export const getStockStatus = (item: InventoryItem): InventoryStatus => {
  if (item.stock <= 0) return 'out-of-stock'
  if (item.stock < 15) return 'critical'
  if (item.stock < 25) return 'high'
  if (item.stock < 50) return 'low'
  return 'in-stock'
}

export const getStockPriority = (item: InventoryItem): StockPriority => {
  if (item.stock <= 0 || item.stock < 15) return 'critical'
  if (item.stock < 25) return 'high'
  if (item.stock < 50) return 'low'
  return 'normal'
}

export const getStatusClass = (status: InventoryStatus) => {
  switch (status) {
    case 'out-of-stock':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'low':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    default:
      return 'bg-green-100 text-green-800 border-green-200'
  }
}

export const getPriorityClass = (priority: StockPriority) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-50 border-l-4 border-red-500 text-red-900'
    case 'high':
      return 'bg-orange-50 border-l-4 border-orange-500 text-orange-900'
    case 'low':
      return 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-900'
    default:
      return 'bg-white'
  }
}

export const getStatusText = (status: InventoryStatus): string => {
  switch (status) {
    case 'out-of-stock':
      return 'Out of Stock'
    case 'critical':
      return 'Critical (<15)'
    case 'high':
      return 'High Priority (<25)'
    case 'low':
      return 'Low Stock (<50)'
    default:
      return 'In Stock'
  }
}

export const getPriorityText = (priority: StockPriority): string => {
  switch (priority) {
    case 'critical':
      return 'Critical Priority'
    case 'high':
      return 'High Priority'
    case 'low':
      return 'Low Priority'
    default:
      return 'Normal'
  }
}

