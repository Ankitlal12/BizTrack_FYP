// API Base URL - can be configured via environment variable
// @ts-ignore - Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Token management
const getToken = (): string | null => {
  return localStorage.getItem('biztrack_token');
};

const setToken = (token: string): void => {
  localStorage.setItem('biztrack_token', token);
};

const removeToken = (): void => {
  localStorage.removeItem('biztrack_token');
};

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from localStorage
  const token = getToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: response.statusText,
        details: `HTTP ${response.status}: ${response.statusText}`
      }));
      
      // Include details if available
      const errorMessage = error.error || error.details || `HTTP error! status: ${response.status}`;
      const errorWithDetails = new Error(errorMessage);
      if (error.details) {
        (errorWithDetails as any).details = error.details;
      }
      throw errorWithDetails;
    }
    
    return await response.json();
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error('Failed to fetch - Cannot connect to server');
      (networkError as any).isNetworkError = true;
      throw networkError;
    }
    
    console.error('API request failed:', error);
    throw error;
  }
}

// Inventory API
export const inventoryAPI = {
  getAll: () => apiRequest<any[]>('/inventory'),
  getById: (id: string) => apiRequest<any>(`/inventory/${id}`),
  create: (data: any) => apiRequest<any>('/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest<any>(`/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<{ message: string }>(`/inventory/${id}`, {
    method: 'DELETE',
  }),
};

// Sales API
export const salesAPI = {
  getAll: (params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any>(`/sales${query}`);
  },
  getById: (id: string) => apiRequest<any>(`/sales/${id}`),
  create: (data: any) => apiRequest<any>('/sales', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest<any>(`/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<{ message: string }>(`/sales/${id}`, {
    method: 'DELETE',
  }),
  recordPayment: (id: string, paymentData: { amount: number; date?: string; method: string; notes?: string }) => apiRequest<any>(`/sales/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData),
  }),
};

// Purchases API
export const purchasesAPI = {
  getAll: (params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any>(`/purchases${query}`);
  },
  getById: (id: string) => apiRequest<any>(`/purchases/${id}`),
  create: (data: any) => apiRequest<any>('/purchases', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest<any>(`/purchases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<{ message: string }>(`/purchases/${id}`, {
    method: 'DELETE',
  }),
  recordPayment: (id: string, paymentData: { amount: number; date?: string; method: string; notes?: string }) => apiRequest<any>(`/purchases/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData),
  }),
};

// Invoices API
export const invoicesAPI = {
  getAll: (params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any>(`/invoices${query}`);
  },
  getById: (id: string) => apiRequest<any>(`/invoices/${id}`),
  create: (data: any) => apiRequest<any>('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest<any>(`/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<{ message: string }>(`/invoices/${id}`, {
    method: 'DELETE',
  }),
  getStats: () => apiRequest<any>('/invoices/stats'),
  updatePayment: (id: string, paymentData: any) => apiRequest<any>(`/invoices/${id}/payment`, {
    method: 'PATCH',
    body: JSON.stringify(paymentData),
  }),
  generateFromSale: (saleId: string) => apiRequest<any>(`/invoices/generate/sale/${saleId}`, {
    method: 'POST',
  }),
  generateFromPurchase: (purchaseId: string) => apiRequest<any>(`/invoices/generate/purchase/${purchaseId}`, {
    method: 'POST',
  }),
};

// Users API
export const usersAPI = {
  getAll: () => apiRequest<any[]>('/users'),
  getById: (id: string) => apiRequest<any>(`/users/${id}`),
  create: (data: any) => apiRequest<any>('/users/add', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  login: (username: string, password: string) => apiRequest<any>('/users/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),
  googleLogin: (credential: string) => apiRequest<any>('/users/google-login', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  }),
  updateStatus: (id: string, active: boolean) => apiRequest<any>(`/users/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ active }),
  }),
  update: (id: string, data: { username?: string; password?: string }) => apiRequest<any>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<{ message: string; deletedUser: any }>(`/users/${id}`, {
    method: 'DELETE',
  }),
};

// Transactions API
export const transactionsAPI = {
  getAll: (params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any>(`/transactions${query}`);
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: (params?: { read?: boolean; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.read !== undefined) queryParams.append('read', params.read.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString();
    return apiRequest<any[]>(`/notifications${query ? `?${query}` : ''}`);
  },
  getUnreadCount: () => apiRequest<{ count: number }>('/notifications/unread/count'),
  getById: (id: string) => apiRequest<any>(`/notifications/${id}`),
  markAsRead: (id: string) => apiRequest<any>(`/notifications/${id}/read`, {
    method: 'PATCH',
  }),
  markAllAsRead: () => apiRequest<{ message: string; updatedCount: number }>('/notifications/read/all', {
    method: 'PATCH',
  }),
  delete: (id: string) => apiRequest<{ message: string }>(`/notifications/${id}`, {
    method: 'DELETE',
  }),
  deleteAllRead: () => apiRequest<{ message: string; deletedCount: number }>('/notifications/read/all', {
    method: 'DELETE',
  }),
};

// Billing API
export const billingAPI = {
  // Customer endpoints
  getAllCustomers: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest<any[]>(`/billing/customers${query}`);
  },
  getCustomerById: (id: string) => apiRequest<any>(`/billing/customers/${id}`),
  createCustomer: (data: any) => apiRequest<any>('/billing/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCustomer: (id: string, data: any) => apiRequest<any>(`/billing/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCustomer: (id: string) => apiRequest<{ message: string }>(`/billing/customers/${id}`, {
    method: 'DELETE',
  }),
  
  // Product endpoints for billing
  getBillingProducts: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest<any[]>(`/billing/products${query}`);
  },
  getBillingProductById: (id: string) => apiRequest<any>(`/billing/products/${id}`),
  
  // Billing/Sale endpoints
  createBill: (data: any) => apiRequest<any>('/billing/bills', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getAllBills: (params?: { limit?: number; skip?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    const query = queryParams.toString();
    return apiRequest<any[]>(`/billing/bills${query ? `?${query}` : ''}`);
  },
  getBillById: (id: string) => apiRequest<any>(`/billing/bills/${id}`),
};

// Export token management functions
export const tokenManager = {
  getToken,
  setToken,
  removeToken,
};

// User API (alias for usersAPI for consistency)
export const userAPI = {
  login: (credentials: { username: string; password: string }) => 
    usersAPI.login(credentials.username, credentials.password),
  updateUser: (id: string, data: { username?: string; password?: string }) => 
    usersAPI.update(id, data),
  getById: (id: string) => usersAPI.getById(id),
  getAll: () => usersAPI.getAll(),
};

// Login History API
export const loginHistoryAPI = {
  getAll: (params?: { page?: number; limit?: number; userId?: string; days?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.userId) query.append('userId', params.userId);
    if (params?.days) query.append('days', params.days.toString());
    
    const queryString = query.toString();
    return apiRequest<{
      loginHistory: any[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalRecords: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>(`/login-history${queryString ? `?${queryString}` : ''}`);
  },
  
  getUserHistory: (userId: string, params?: { page?: number; limit?: number; days?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.days) query.append('days', params.days.toString());
    
    const queryString = query.toString();
    return apiRequest<{
      loginHistory: any[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalRecords: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>(`/login-history/user/${userId}${queryString ? `?${queryString}` : ''}`);
  },
  
  getStats: (days?: number) => {
    const query = days ? `?days=${days}` : '';
    return apiRequest<{
      totalLogins: number;
      failedLogins: number;
      uniqueUsers: number;
      loginMethods: Array<{ _id: string; count: number }>;
      roleBreakdown: Array<{ _id: string; count: number }>;
      period: string;
    }>(`/login-history/stats${query}`);
  },
};

// Generic API client for direct usage
const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, data?: any) => apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }),
  put: <T>(endpoint: string, data?: any) => apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }),
  patch: <T>(endpoint: string, data?: any) => apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, {
    method: 'DELETE',
  }),
};

export default api;

