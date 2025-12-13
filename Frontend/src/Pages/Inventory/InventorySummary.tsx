import React, { useMemo } from 'react'
import { InventoryItem, getStockStatus } from './helpers'

type InventorySummaryProps = {
  items: InventoryItem[]
}

const InventorySummary: React.FC<InventorySummaryProps> = ({ items }) => {
  const totals = useMemo(() => {
    const totalStock = items.reduce((sum, item) => sum + item.stock, 0)
    const lowStock = items.filter((i) => getStockStatus(i) === 'low').length
    const outOfStock = items.filter((i) => getStockStatus(i) === 'out-of-stock').length
    const inventoryValue = items
      .reduce((sum, item) => sum + item.stock * item.cost, 0)
      .toFixed(2)

    return { totalStock, lowStock, outOfStock, inventoryValue }
  }, [items])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-5 rounded-lg shadow-sm">
        <h3 className="text-sm text-gray-500">Total Items</h3>
        <p className="text-2xl font-bold">{totals.totalStock}</p>
      </div>

      <div className="bg-white p-5 rounded-lg shadow-sm">
        <h3 className="text-sm text-gray-500">Low Stock Items</h3>
        <p className="text-2xl font-bold text-yellow-600">{totals.lowStock}</p>
      </div>

      <div className="bg-white p-5 rounded-lg shadow-sm">
        <h3 className="text-sm text-gray-500">Out of Stock</h3>
        <p className="text-2xl font-bold text-red-600">{totals.outOfStock}</p>
      </div>

      <div className="bg-white p-5 rounded-lg shadow-sm">
        <h3 className="text-sm text-gray-500">Inventory Value</h3>
        <p className="text-2xl font-bold">${totals.inventoryValue}</p>
      </div>
    </div>
  )
}

export default InventorySummary

