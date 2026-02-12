import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import { customersAPI } from '../services/api';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  UserX,
  Phone,
  Mail,
  MapPin,
  Receipt,
  ShoppingBag
} from 'lucide-react';
import CustomerModal from '../customers/CustomerModal';
import CustomerPurchaseHistoryModal from '../customers/CustomerPurchaseHistoryModal';
import { useAuth } from '../contexts/AuthContext';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  isActive: boolean;
  notes?: string;
  purchaseCount?: number;
}

interface CustomerFilters {
  isActive?: boolean;
}

const Customers: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<{ id: string; name: string } | null>(null);
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (user?.role === 'staff') {
      toast.error('Access denied. You do not have permission to view this page.');
      navigate('/inventory');
      return;
    }
  }, [user?.role, navigate]);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      params.append('page', page.toString());
      params.append('limit', '10');

      const response = await customersAPI.getAll(params.toString());
      setCustomers(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (error: any) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, page]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setShowModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleViewPurchaseHistory = (customer: Customer) => {
    setSelectedCustomerForHistory({ id: customer._id, name: customer.name });
    setShowPurchaseHistory(true);
  };

  const handleDeactivateCustomer = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to deactivate ${customer.name}?`)) {
      return;
    }

    try {
      await customersAPI.delete(customer._id);
      toast.success('Customer deactivated successfully');
      loadCustomers();
    } catch (error: any) {
      console.error('Error deactivating customer:', error);
      toast.error(error.message || 'Failed to deactivate customer');
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  if (loading && customers.length === 0) {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600">Manage your customer relationships and purchase history</p>
          </div>
          <button
            onClick={handleCreateCustomer}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            New Customer
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search customers..."
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
              <option value="all">All Customers</option>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <div key={customer._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(customer.isActive)}`}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.address?.city && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{customer.address.city}, {customer.address.country}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <ShoppingBag className="w-4 h-4" />
                  <span>{customer.purchaseCount || 0} purchase(s)</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewPurchaseHistory(customer)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100"
                    title="View Purchase History"
                  >
                    <Receipt className="w-4 h-4" />
                    History
                  </button>
                  <button
                    onClick={() => handleEditCustomer(customer)}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {customer.isActive && (
                    <button
                      onClick={() => handleDeactivateCustomer(customer)}
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

        {customers.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No customers found</p>
            <button
              onClick={handleCreateCustomer}
              className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Add Your First Customer
            </button>
          </div>
        )}

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

      {showModal && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => {
            setShowModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            loadCustomers();
            setShowModal(false);
            setSelectedCustomer(null);
          }}
        />
      )}

      {showPurchaseHistory && selectedCustomerForHistory && (
        <CustomerPurchaseHistoryModal
          customerId={selectedCustomerForHistory.id}
          customerName={selectedCustomerForHistory.name}
          onClose={() => {
            setShowPurchaseHistory(false);
            setSelectedCustomerForHistory(null);
          }}
        />
      )}
    </Layout>
  );
};

export default Customers;
