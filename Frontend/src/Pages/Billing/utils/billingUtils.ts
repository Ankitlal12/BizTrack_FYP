import { Product, CartItem } from '../types'

export const loadInventoryProducts = (): Product[] => {
  const inventoryKey = 'biztrack_inventory'
  const storedInventory = JSON.parse(
    localStorage.getItem(inventoryKey) || '[]',
  )
  // Transform inventory items to product format for billing
  // Add validation to ensure all required fields exist
  const products = storedInventory
    .filter((item: any) => item && item.name && item.price !== undefined)
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      barcode: item.sku || '',
      price: parseFloat(item.price) || 0,
      category: item.category || 'Uncategorized',
      stock: parseInt(item.stock) || 0,
    }))
  return products
}

export const calculateTotals = (cartItems: CartItem[]) => {
  const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0)
  const tax = subtotal * 0.07 // 7% tax
  const total = subtotal + tax
  return { subtotal, tax, total }
}

export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  return new Date(dateString).toLocaleDateString(undefined, options)
}

export const updateInventoryInStorage = (
  cartItems: CartItem[],
  onLowStock: (item: { name: string; stock: number }) => void,
) => {
  // Update inventory in localStorage by reducing stock for each item in the cart
  const inventoryKey = 'biztrack_inventory'
  const storedInventory = JSON.parse(
    localStorage.getItem(inventoryKey) || '[]',
  )
  const lowStockItems: { name: string; stock: number }[] = []
  const updatedInventory = storedInventory.map((item: any) => {
    const cartItem = cartItems.find((ci) => ci.id === item.id)
    if (cartItem) {
      const newStock = item.stock - cartItem.quantity
      // Check if stock is now below 5
      if (newStock < 5 && newStock >= 0) {
        lowStockItems.push({
          name: item.name,
          stock: newStock,
        })
      }
      return {
        ...item,
        stock: newStock,
        lastUpdated: new Date().toISOString().split('T')[0],
      }
    }
    return item
  })
  localStorage.setItem(inventoryKey, JSON.stringify(updatedInventory))
  // Trigger callbacks for low stock items
  lowStockItems.forEach((item) => {
    onLowStock(item)
  })
}

export const saveSaleRecord = (completedSale: any, paymentMethod: string) => {
  // Save sale to localStorage for Sales page
  const salesKey = 'biztrack_sales'
  const storedSales = JSON.parse(localStorage.getItem(salesKey) || '[]')
  const saleRecord = {
    id: completedSale.invoiceNumber,
    customer: completedSale.customer,
    items: completedSale.items,
    date: completedSale.date.split('T')[0],
    subtotal: completedSale.subtotal,
    tax: completedSale.tax,
    total: completedSale.total,
    status: 'completed',
    paymentStatus: paymentMethod === 'cash' ? 'paid' : 'pending',
    paymentMethod: completedSale.paymentMethod,
    notes: completedSale.notes,
  }
  storedSales.unshift(saleRecord)
  localStorage.setItem(salesKey, JSON.stringify(storedSales))
  // Dispatch a custom event to notify Sales page of the update
  window.dispatchEvent(new CustomEvent('salesUpdated'))
}

export const saveTransactionHistory = (completedSale: any) => {
  // Save transaction history
  const transactionsKey = 'biztrack_transactions'
  const storedTransactions = JSON.parse(
    localStorage.getItem(transactionsKey) || '[]',
  )
  // Create a transaction for each item sold
  completedSale.items.forEach((item: CartItem) => {
    const transaction = {
      id: `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'sale',
      item: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
      date: completedSale.date.split('T')[0],
      reference: completedSale.invoiceNumber,
    }
    storedTransactions.unshift(transaction)
  })
  localStorage.setItem(transactionsKey, JSON.stringify(storedTransactions))
}

