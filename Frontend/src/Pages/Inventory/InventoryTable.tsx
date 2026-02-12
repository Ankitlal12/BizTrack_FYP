import React, { useState } from 'react'
import { Package2, AlertTriangle } from 'lucide-react'
import { InventoryItem, getStatusClass, getStockStatus, getStockPriority, getPriorityClass, getStatusText } from './helpers'
import SimpleRestockModal from '../../reorder/SimpleRestockModal'
import { useAuth } from '../../contexts/AuthContext'

type InventoryTableProps = {
  items: InventoryItem[]
  isLoading: boolean
  onItemUpdated?: () => void
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  isLoading,
  onItemUpdated,
}) => {
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showRestockModal, setShowRestockModal] = useState(false);

  // Check if user can restock (only owner and manager)
  const canRestock = user?.role === 'owner' || user?.role === 'manager';

  const handleRestockClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowRestockModal(true);
  };

  const handleRestockSuccess = () => {
    setShowRestockModal(false);
    setSelectedItem(null);
    if (onItemUpdated) {
      onItemUpdated();
    }
  };
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
            <th className="px-4 py-3 text-left text-xs text-gray-500">Priority</th>
            {canRestock && <th className="px-4 py-3 text-center text-xs text-gray-500">Actions</th>}
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={canRestock ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                Loading inventory...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={canRestock ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                No items found
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const status = getStockStatus(item)
              const priority = getStockPriority(item)
              const itemId = item._id || item.id

              return (
                <tr
                  key={itemId}
                  className={`${getPriorityClass(priority)} transition-colors hover:bg-opacity-75`}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      {priority === 'critical' && (
                        <AlertTriangle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.supplier}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 font-mono text-gray-600">{item.sku}</td>
                  <td className="px-4 py-4">{item.category}</td>

                  <td className="px-4 py-4">
                    <div className="font-medium">Rs {item.price.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">
                      Cost: Rs {item.cost.toFixed(2)}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className={`font-medium ${
                      item.stock <= 0 ? 'text-red-700' :
                      item.stock < 15 ? 'text-red-600' : 
                      item.stock < 25 ? 'text-orange-600' : 
                      item.stock < 50 ? 'text-yellow-600' :
                      'text-gray-900'
                    }`}>
                      {item.stock} units
                    </div>
                    {item.stock <= 0 && (
                      <div className="text-xs text-red-700 font-medium">OUT OF STOCK</div>
                    )}
                    {item.stock > 0 && item.stock < 15 && (
                      <div className="text-xs text-red-600 font-medium">CRITICAL LEVEL</div>
                    )}
                    {item.stock >= 15 && item.stock < 25 && (
                      <div className="text-xs text-orange-600 font-medium">HIGH PRIORITY</div>
                    )}
                    {item.stock >= 25 && item.stock < 50 && (
                      <div className="text-xs text-yellow-600 font-medium">LOW STOCK</div>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(status)}`}
                    >
                      {getStatusText(status)}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      {priority === 'critical' && (
                        <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        priority === 'critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                        priority === 'high' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        priority === 'low' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        {priority === 'critical' ? 'CRITICAL' :
                         priority === 'high' ? 'HIGH' :
                         priority === 'low' ? 'LOW' : 'NORMAL'}
                      </span>
                    </div>
                  </td>

                  {canRestock && (
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleRestockClick(item)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          priority === 'critical' 
                            ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-200' 
                            : priority === 'high'
                            ? 'bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200'
                            : priority === 'low'
                            ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-200'
                            : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200'
                        }`}
                        title={`Restock this item ${priority === 'critical' ? '(URGENT!)' : priority === 'high' ? '(High Priority)' : priority === 'low' ? '(Low Stock)' : ''}`}
                      >
                        <Package2 className="w-4 h-4" />
                        {priority === 'critical' ? 'URGENT' : 
                         priority === 'high' ? 'HIGH' :
                         priority === 'low' ? 'LOW' : 'Restock'}
                      </button>
                    </td>
                  )}
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {/* Simple Restock Modal - Only for authorized users */}
      {showRestockModal && selectedItem && canRestock && (
        <SimpleRestockModal
          item={selectedItem}
          onClose={() => setShowRestockModal(false)}
          onSuccess={handleRestockSuccess}
        />
      )}
    </div>
  )
}

export default InventoryTable
