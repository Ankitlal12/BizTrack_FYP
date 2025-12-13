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
  supplier: string
  location: string
  lastUpdated?: string | Date
}

export type InventoryStatus = 'out-of-stock' | 'low' | 'in-stock'

export const getStockStatus = (item: InventoryItem): InventoryStatus => {
  if (item.stock <= 0) return 'out-of-stock'
  if (item.stock < 5) return 'low'
  return 'in-stock'
}

export const getStatusClass = (status: InventoryStatus) => {
  switch (status) {
    case 'out-of-stock':
      return 'bg-red-100 text-red-800'
    case 'low':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-green-100 text-green-800'
  }
}

