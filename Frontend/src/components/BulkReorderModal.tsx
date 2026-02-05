import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, ShoppingCart, Package, DollarSign, Truck } from 'lucide-react';
import { reorderAPI } from '../services/api';
import { BulkReorderItem } from '../Pages/LowStock/types';

interface BulkReorderModalProps {
  selectedItems: BulkReorderItem[];
  onClose: () => void;
  onSuccess: () => void;
}

interface GroupedItems {
  [supplierId: string]: {
    supplier: {
      _id: string;
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
    };
    items: BulkReorderItem[];
    subtotal: number;
  };
}

const BulkReorderModal: React.FC<BulkReorderModalProps> = ({
  selectedItems,
  onClose,
  onSuccess
}) => {
  const [items, setItems] = useState<BulkReorderItem[]>(selectedItems);
  const [loading, setLoading] = useState(false);
  const [groupedItems, setGroupedItems] = useState<GroupedItems>({});

  useEffect(() => {
    groupItemsBySupplier();
  }, [items]);

  const groupItemsBySupplier = () => {
    const grouped: GroupedItems = {};

    items.forEach(item => {
      if (!item.item || !item.supplierId) return;

      const supplierId = item.supplierId;
      const supplier = item.item.preferredSupplierId;

      if (!supplier) return;

      if (!grouped[supplierId]) {
        grouped[supplierId] = {
          supplier: {
            _id: supplier._id,
            name: supplier.name,
            contactPerson: supplier.contactPerson,
            phone: supplier.phone,
            email: supplier.email
          },
          items: [],
          subtotal: 0
        };
      }

      grouped[supplierId].items.push(item);
      grouped[supplierId].subtotal += item.quantity * (item.item.lastPurchasePrice || item.item.cost);
    });

    setGroupedItems(grouped);
  };

  const updateItemQuantity = (inventoryId: string, newQuantity: number) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.inventoryId === inventoryId
          ? { ...item, quantity: Math.max(1, newQuantity) }
          : item
      )
    );
  };

  const removeItem = (inventoryId: string) => {
    setItems(prevItems => prevItems.filter(item => item.inventoryId !== inventoryId));
  };

  const getTotalCost = () => {
    return Object.values(groupedItems).reduce((total, group) => total + group.subtotal, 0);
  };

  const getTotalSuppliers = () => {
    return Object.keys(groupedItems).length;
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('No items to reorder');
      return;
    }

    try {
      setLoading(true);

      const response = await reorderAPI.createBulk({
        items: items.map(item => ({
          inventoryId: item.inventoryId,
          quantity: item.quantity,
          supplierId: item.supplierId
        }))
      });

      toast.success(response.message || 'Bulk purchase orders created successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating bulk reorders:', error);
      toast.error(error.message || 'Failed to create bulk reorders');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Items Selected</h2>
          <p className="text-gray-600 mb-4">Please select items to create bulk reorders.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Bulk Reorder</h2>
              <p className="text-sm text-gray-600">
                Create purchase orders for {items.length} item(s) from {getTotalSuppliers()} supplier(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600">Total Items</p>
                  <p className="text-xl font-semibold text-blue-900">{items.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600">Suppliers</p>
                  <p className="text-xl font-semibold text-green-900">{getTotalSuppliers()}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600">Total Cost</p>
                  <p className="text-xl font-semibold text-purple-900">{formatCurrency(getTotalCost())}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Items by Supplier */}
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([supplierId, group]) => (
              <div key={supplierId} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Supplier Header */}
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">{group.supplier.name}</h3>
                      {group.supplier.contactPerson && (
                        <p className="text-sm text-gray-600">Contact: {group.supplier.contactPerson}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Subtotal</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(group.subtotal)}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-200">
                  {group.items.map((item) => (
                    <div key={item.inventoryId} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{item.item?.name}</h4>
                              <p className="text-sm text-gray-600">SKU: {item.item?.sku}</p>
                              <p className="text-sm text-gray-600">
                                Current Stock: {item.item?.stock} | Reorder Level: {item.item?.reorderLevel}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div>
                                <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(item.inventoryId, parseInt(e.target.value) || 1)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-teal-500"
                                />
                              </div>
                              
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Unit Cost</p>
                                <p className="font-medium">{formatCurrency(item.item?.lastPurchasePrice || item.item?.cost || 0)}</p>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Total</p>
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(item.quantity * (item.item?.lastPurchasePrice || item.item?.cost || 0))}
                                </p>
                              </div>
                              
                              <button
                                onClick={() => removeItem(item.inventoryId)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Remove item"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || items.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Create {getTotalSuppliers()} Purchase Order{getTotalSuppliers() > 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkReorderModal;