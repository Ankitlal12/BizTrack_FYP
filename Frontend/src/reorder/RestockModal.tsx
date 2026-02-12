import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Package, ShoppingCart, Zap } from 'lucide-react';
import { reorderAPI, suppliersAPI } from '../services/api';

interface RestockModalProps {
  item: {
    _id?: string;
    id?: string | number;
    name: string;
    sku: string;
    stock: number;
    reorderLevel: number;
    cost: number;
    lastPurchasePrice?: number;
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
  paymentTerms: string;
  averageLeadTimeDays: number;
  rating: number;
}

const RestockModal: React.FC<RestockModalProps> = ({
  item,
  onClose,
  onSuccess
}) => {
  const [quantity, setQuantity] = useState(10); // Default quantity
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  useEffect(() => {
    loadSuppliers();
    // Set preferred supplier if available
    if (item.preferredSupplierId) {
      setSelectedSupplierId(item.preferredSupplierId);
    }
  }, [item.preferredSupplierId]);

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

  const selectedSupplier = suppliers.find(s => s._id === selectedSupplierId);
  const estimatedCost = quantity * (item.lastPurchasePrice || item.cost);

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

      // Check if we have the required data
      if (!item._id && !item.id) {
        throw new Error('Item ID is missing');
      }

      const itemId = item._id || item.id;

      console.log('Creating restock order with data:', {
        inventoryId: itemId,
        quantity,
        supplierId: selectedSupplierId
      });

      console.log('API Base URL:', 'http://localhost:5000/api');

      const response = await reorderAPI.createQuick({
        inventoryId: itemId,
        quantity,
        supplierId: selectedSupplierId
      });
      
      console.log('Restock response:', response);
      toast.success(`✅ Restock completed successfully! 
      📦 ${item.name} restocked with ${quantity} units
      🧾 Purchase order ${response.data?.purchaseNumber || response.data?.purchaseOrderId || 'created'} 
      📈 New stock level: ${item.stock + quantity} units
      
      💡 Check the Purchase page to see the new purchase order!`, {
        duration: 6000,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating restock order:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      let errorMessage = 'Failed to create restock order';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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

  const getStockStatus = () => {
    if (item.stock <= 0) return { color: 'text-red-600', label: 'Out of Stock' };
    if (item.stock <= item.reorderLevel) return { color: 'text-orange-600', label: 'Low Stock' };
    return { color: 'text-green-600', label: 'In Stock' };
  };

  const stockStatus = getStockStatus();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600" />
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
        <div className="p-6 space-y-6">
          {/* Current Stock Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Current Stock Information
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Current Stock</p>
                <p className={`font-medium ${stockStatus.color}`}>
                  {item.stock} units
                </p>
              </div>
              <div>
                <p className="text-gray-600">Reorder Level</p>
                <p className="font-medium text-gray-900">{item.reorderLevel} units</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <span className={`font-medium ${stockStatus.color}`}>
                  {stockStatus.label}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                💡 <strong>Proactive Restocking:</strong> You can restock items even when they're not low stock to maintain optimal inventory levels.
              </p>
            </div>
          </div>

          {/* Restock Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restock Quantity
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter quantity"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  units
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                New stock level will be: {item.stock + quantity} units
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier
              </label>
              {loadingSuppliers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name} {supplier.contactPerson && `(${supplier.contactPerson})`}
                    </option>
                  ))}
                </select>
              )}
              
              {selectedSupplier && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Contact Person</p>
                      <p className="font-medium">{selectedSupplier.contactPerson || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Lead Time</p>
                      <p className="font-medium">{selectedSupplier.averageLeadTimeDays} days</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Payment Terms</p>
                      <p className="font-medium">{selectedSupplier.paymentTerms}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Rating</p>
                      <p className="font-medium">{selectedSupplier.rating}/5 ⭐</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cost Estimation */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Cost Estimation</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Unit Cost</p>
                  <p className="font-medium">{formatCurrency(item.lastPurchasePrice || item.cost)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Estimated Cost</p>
                  <p className="font-semibold text-lg text-green-700">{formatCurrency(estimatedCost)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
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

export default RestockModal;