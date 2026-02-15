import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Package, ShoppingCart } from 'lucide-react';
import { inventoryAPI, suppliersAPI, purchasesAPI } from '../services/api';

interface SimpleRestockModalProps {
  item: {
    _id?: string;
    id?: string | number;
    name: string;
    sku: string;
    stock: number;
    cost: number;
    supplier?: string;
    preferredSupplierId?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

const SimpleRestockModal: React.FC<SimpleRestockModalProps> = ({
  item,
  onClose,
  onSuccess
}) => {
  const [quantity, setQuantity] = useState(10);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    // Auto-select preferred supplier when suppliers are loaded
    if (suppliers.length > 0 && !selectedSupplierId) {
      if (item.preferredSupplierId) {
        // Use preferredSupplierId if available
        setSelectedSupplierId(item.preferredSupplierId);
      } else if (item.supplier) {
        // Otherwise, try to find supplier by name
        const matchingSupplier = suppliers.find(
          s => s.name.toLowerCase() === item.supplier?.toLowerCase()
        );
        if (matchingSupplier) {
          setSelectedSupplierId(matchingSupplier._id);
        } else {
          // If no match found, select the first supplier
          if (suppliers.length > 0) {
            setSelectedSupplierId(suppliers[0]._id);
          }
        }
      } else {
        // No preferred supplier, select first one
        if (suppliers.length > 0) {
          setSelectedSupplierId(suppliers[0]._id);
        }
      }
    }
  }, [suppliers, item.preferredSupplierId, item.supplier]);

  // Get the preferred supplier info
  const preferredSupplier = suppliers.find(s => 
    s._id === item.preferredSupplierId || 
    s.name.toLowerCase() === item.supplier?.toLowerCase()
  );

  const isUsingPreferredSupplier = selectedSupplierId && (
    selectedSupplierId === item.preferredSupplierId ||
    suppliers.find(s => s._id === selectedSupplierId)?.name.toLowerCase() === item.supplier?.toLowerCase()
  );

  const loadSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll('isActive=true');
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }

    try {
      setLoading(true);

      const itemId = item._id || item.id;
      if (!itemId) {
        throw new Error('Item ID is missing');
      }

      // Step 1: Update inventory directly
      const newStock = item.stock + quantity;
      await inventoryAPI.update(itemId.toString(), {
        stock: newStock
      });

      // Step 2: Create a simple purchase record
      const selectedSupplier = suppliers.find(s => s._id === selectedSupplierId);
      const totalCost = quantity * item.cost;

      await purchasesAPI.create({
        supplierName: selectedSupplier?.name || 'Unknown Supplier',
        supplierEmail: selectedSupplier?.email || '',
        supplierPhone: selectedSupplier?.phone || '',
        items: [{
          name: item.name,
          quantity: quantity,
          cost: item.cost,
          total: totalCost
        }],
        subtotal: totalCost,
        total: totalCost,
        status: 'received',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        notes: `Direct restock for ${item.name} - Added ${quantity} units`
      });

      toast.success(`✅ Restock completed! 
      📦 ${item.name} restocked with ${quantity} units
      📈 New stock level: ${newStock} units`, {
        duration: 4000,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error restocking:', error);
      toast.error(error.message || 'Failed to restock item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Restock Item</h2>
              <p className="text-sm text-gray-600">{item.name}</p>
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
        <div className="p-6 space-y-4">
          {/* Preferred Supplier Info */}
          {preferredSupplier && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 mt-0.5">ℹ️</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Original Supplier: {preferredSupplier.name}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    This item was previously purchased from this supplier. Using the same supplier ensures consistency.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Current Stock: <span className="font-medium">{item.stock} units</span></p>
            <p className="text-sm text-gray-600">New Stock: <span className="font-medium text-green-600">{item.stock + quantity} units</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Add
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier {preferredSupplier && <span className="text-xs text-gray-500">(Auto-selected)</span>}
              </label>
              {loadingSuppliers ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isUsingPreferredSupplier ? 'border-green-300 bg-green-50' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                        {(supplier._id === item.preferredSupplierId || 
                          supplier.name.toLowerCase() === item.supplier?.toLowerCase()) && ' ⭐ (Original)'}
                      </option>
                    ))}
                  </select>
                  {isUsingPreferredSupplier && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      ✓ Using original supplier - Recommended for consistency
                    </p>
                  )}
                  {!isUsingPreferredSupplier && selectedSupplierId && preferredSupplier && (
                    <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                      ⚠️ Different supplier selected - Original was {preferredSupplier.name}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                Estimated Cost: <span className="font-medium text-green-700">Rs {(quantity * item.cost).toFixed(2)}</span>
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedSupplierId || quantity <= 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Restock Now
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SimpleRestockModal;