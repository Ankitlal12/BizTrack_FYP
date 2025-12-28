import React from 'react'
import { EditIcon, TrashIcon } from 'lucide-react'
import { InventoryItem, getStatusClass, getStockStatus } from './helpers'

type InventoryTableProps = {
  items: InventoryItem[]
  isLoading: boolean
  onEditItem: (item: InventoryItem) => void
  onDeleteItem: (id: string) => void
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  isLoading,
  onEditItem,
  onDeleteItem,
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
            <th className="px-4 py-3 text-right text-xs text-gray-500">Actions</th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                Loading inventory...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
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
                    item.stock < 10 ? 'bg-red-50 text-red-700' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.supplier}</div>
                  </td>

                  <td className="px-4 py-4 font-mono text-gray-600">{item.sku}</td>
                  <td className="px-4 py-4">{item.category}</td>

                  <td className="px-4 py-4">
                    <div className="font-medium">${item.price.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">
                      Cost: ${item.cost.toFixed(2)}
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

                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => onEditItem(item)}
                      className="text-teal-600 mr-3 hover:text-teal-700"
                    >
                      <EditIcon size={16} />
                    </button>
                    {item._id && (
                      <button
                        onClick={() => onDeleteItem(item._id!)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon size={16} />
                      </button>
                    )}
                  </td>
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
