import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import { suppliersAPI } from '../services/api';
import { Supplier, SupplierFilters } from './LowStock/types';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  UserX,
  Phone,
  Mail,
  MapPin,
  Star,
  Package,
  Receipt
} from 'lucide-react';
import SupplierModal from '../components/SupplierModal';
import SupplierPurchaseHistoryModal from '../components/SupplierPurchaseHistoryModal';
import { useAuth } from '../contexts/AuthContext';

const Suppliers: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState<{ id: string; name: string } | null>(null);
  const [filters, setFilters] = useState<SupplierFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Check if user has access to suppliers page
  useEffect(() => {
    if (user?.role === 'staff') {
      toast.error('Access denied. You do not have permission to view this page.');
      navigate('/inventory');
      return;
    }
  }, [user?.role, navigate]);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      params.append('page', page.toString());
      params.append('limit', '10');

      const response = await suppliersAPI.getAll(params.toString());
      setSuppliers(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (error: any) {
      console.error('Error loading suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, page]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleCreateSupplier = () => {
    setSelectedSupplier(null);
    setShowModal(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowModal(true);
  };

  const handleViewPurchaseHistory = (supplier: Supplier) => {
    setSelectedSupplierForHistory({ id: supplier._id, name: supplier.name });
    setShowPurchaseHistory(true);
  };

  const handleDeactivateSupplier = async (supplier: Supplier) => {
    if (!confirm(`Are you sure you want to deactivate ${supplier.name}?`)) {
      return;
    }

    try {
      await suppliersAPI.delete(supplier._id);
      toast.success('Supplier deactivated successfully');
      loadSuppliers();
    } catch (error: any) {
      console.error('Error deactivating supplier:', error);
      toast.error(error.message || 'Failed to deactivate supplier');
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading && suppliers.length === 0) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
            <p className="text-gray-600">Manage your supplier relationships and contacts</p>
          </div>
          <button
            onClick={handleCreateSupplier}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            New Supplier
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent w-full"
              />
            </div>

            <select
              value={filters.isActive === undefined ? 'all' : filters.isActive.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setFilters({
                  ...filters,
                  isActive: value === 'all' ? undefined : value === 'true'
                });
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Suppliers</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <button
              onClick={() => {
                setFilters({});
                setSearchTerm('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Suppliers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => (
            <div key={supplier._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                    {supplier.contactPerson && (
                      <p className="text-sm text-gray-600">{supplier.contactPerson}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(supplier.isActive)}`}>
                    {supplier.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address?.city && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{supplier.address.city}, {supplier.address.country}</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-600">Payment Terms</p>
                    <p className="font-medium text-gray-900">{supplier.paymentTerms}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Lead Time</p>
                    <p className="font-medium text-gray-900">{supplier.averageLeadTimeDays} days</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-600">Rating:</span>
                  <div className="flex items-center gap-1">
                    {renderStars(supplier.rating)}
                    <span className="text-sm text-gray-600 ml-1">({supplier.rating}/5)</span>
                  </div>
                </div>

                {/* Products Count */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <Package className="w-4 h-4" />
                  <span>{supplier.productCount || supplier.products?.length || 0} product(s)</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewPurchaseHistory(supplier)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100"
                    title="View Purchase History"
                  >
                    <Receipt className="w-4 h-4" />
                    History
                  </button>
                  <button
                    onClick={() => handleEditSupplier(supplier)}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {supplier.isActive && (
                    <button
                      onClick={() => handleDeactivateSupplier(supplier)}
                      className="flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                      title="Deactivate"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {suppliers.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No suppliers found</p>
            <button
              onClick={handleCreateSupplier}
              className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Add Your First Supplier
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <SupplierModal
          supplier={selectedSupplier}
          onClose={() => {
            setShowModal(false);
            setSelectedSupplier(null);
          }}
          onSuccess={() => {
            loadSuppliers();
            setShowModal(false);
            setSelectedSupplier(null);
          }}
        />
      )}

      {/* Purchase History Modal */}
      {showPurchaseHistory && selectedSupplierForHistory && (
        <SupplierPurchaseHistoryModal
          supplierId={selectedSupplierForHistory.id}
          supplierName={selectedSupplierForHistory.name}
          onClose={() => {
            setShowPurchaseHistory(false);
            setSelectedSupplierForHistory(null);
          }}
        />
      )}
    </Layout>
  );
};

export default Suppliers;