import React from 'react'
import { InventoryItem, getStatusClass, getStockStatus } from './helpers'

type InventoryTableProps = {
  items: InventoryItem[]
  isLoading: boolean
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  isLoading,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs text-gray-500">Product</th>
            <th className="px-4 py-3 text-left text-xs text-gray-500">SKU</th>
            <th className="px-4 py-3 text-left text-xs text-gray-500">Category</th>
            <th className="px-4 py-3 text-left text-xs text-gray-500">Price</th>
            <th className="px-4 py-3 text-left text-xs text-gray-500">Stock</th>
            <th className="px-4 py-3 text-left text-xs text-gray-500">Status</th>
            <th className="px-4 py-3 text-left text-xs text-gray-500">Location</th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                Loading inventory...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                No items found
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const status = getStockStatus(item)
              const itemId = item._id || item.id

              return (
                <tr
                  key={itemId}
                  className={`hover:bg-gray-50 ${
                    item.stock < 10 ? 'text-red-700' : ''//bg-red-50
                  }`}
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.supplier}</div>
                  </td>

                  <td className="px-4 py-4 font-mono text-gray-600">{item.sku}</td>
                  <td className="px-4 py-4">{item.category}</td>

                  <td className="px-4 py-4">
                    <div className="font-medium">Rs {item.price.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">
                      Cost: Rs {item.cost.toFixed(2)}
                    </div>
                  </td>

                  <td className="px-4 py-4">{item.stock}</td>

                  <td className="px-4 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusClass(status)}`}
                    >
                      {status === 'out-of-stock'
                        ? 'Out of Stock'
                        : status === 'low'
                        ? 'Low Stock'
                        : 'In Stock'}
                    </span>
                  </td>

                  <td className="px-4 py-4">{item.location}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export default InventoryTable
