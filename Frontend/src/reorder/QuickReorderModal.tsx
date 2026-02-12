import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Package, AlertTriangle, ShoppingCart, Zap } from 'lucide-react';
import { reorderAPI, suppliersAPI } from '../services/api';
import { LowStockItem, Supplier } from '../Pages/LowStock/types';

interface QuickReorderModalProps {
  item: LowStockItem;
  onClose: () => void;
  onSuccess: () => void;
}

const QuickReorderModal: React.FC<QuickReorderModalProps> = ({
  item,
  onClose,
  onSuccess
}) => {
  const [quantity, setQuantity] = useState(item.analytics.suggestedQuantity);
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    item.preferredSupplierId?._id || ''
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [createPurchase, setCreatePurchase] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

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

      console.log('Creating quick reorder with data:', {
        inventoryId: item._id,
        quantity,
        supplierId: selectedSupplierId
      });

      if (createPurchase) {
        // Create reorder and purchase order directly
        const reorderResponse = await reorderAPI.createQuick({
          inventoryId: item._id,
          quantity,
          supplierId: selectedSupplierId
        });

        console.log('Reorder response:', reorderResponse);

        if (reorderResponse.data) {
          await reorderAPI.createPurchase(reorderResponse.data._id, {
            quantity,
            notes: `Quick reorder for ${item.name} - ${item.urgencyLevel} priority`
          });
          toast.success('Purchase order created successfully!');
        }
      } else {
        // Create reorder request only
        const response = await reorderAPI.createQuick({
          inventoryId: item._id,
          quantity,
          supplierId: selectedSupplierId
        });
        
        console.log('Quick reorder response:', response);
        toast.success(`✅ Reorder completed successfully! 
        📦 ${item.name} restocked with ${quantity} units
        🧾 Purchase order ${response.data?.purchaseNumber || response.data?.purchaseOrderId || 'created'} 
        📈 New stock level: ${item.stock + quantity} units
        
        💡 Check the Purchase page to see the new purchase order!`, {
          duration: 6000,
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error creating reorder:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || error.message || 'Failed to create reorder');
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Zap className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Quick Reorder</h2>
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
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Current Stock</p>
                <p className={`font-medium ${item.stock <= 0 ? 'text-red-600' : item.stock <= item.reorderLevel ? 'text-orange-600' : 'text-gray-900'}`}>
                  {item.stock} units
                </p>
              </div>
              <div>
                <p className="text-gray-600">Reorder Level</p>
                <p className="font-medium text-gray-900">{item.reorderLevel} units</p>
              </div>
              <div>
                <p className="text-gray-600">Days Until Stockout</p>
                <p className={`font-medium ${
                  item.analytics.daysUntilStockout <= 3 ? 'text-red-600' :
                  item.analytics.daysUntilStockout <= 7 ? 'text-orange-600' : 'text-gray-900'
                }`}>
                  {item.analytics.daysUntilStockout === 999 ? '∞' : `${item.analytics.daysUntilStockout} days`}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Priority</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getUrgencyColor(item.urgencyLevel)}`}>
                  {item.urgencyLevel}
                </span>
              </div>
            </div>

            {item.stock <= 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700 font-medium">
                  This item is out of stock and requires immediate attention!
                </p>
              </div>
            )}
          </div>

          {/* Reorder Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Quantity
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter quantity"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  units
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Suggested: {item.analytics.suggestedQuantity} units
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier
              </label>
              {loadingSuppliers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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

            {/* Action Options */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="createPurchase"
                  checked={createPurchase}
                  onChange={(e) => setCreatePurchase(e.target.checked)}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="createPurchase" className="text-sm text-gray-700">
                  Create Purchase Order directly (skip approval process)
                </label>
              </div>
              
              <p className="text-xs text-gray-500">
                {createPurchase 
                  ? 'This will create a purchase order immediately and send it to the supplier.'
                  : 'This will create a reorder request that requires approval before creating a purchase order.'
                }
              </p>
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    {createPurchase ? 'Create Purchase Order' : 'Create Reorder Request'}
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

export default QuickReorderModal;