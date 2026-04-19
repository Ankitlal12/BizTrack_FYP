// API Base URL - can be configured via environment variable
// @ts-ignore - Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ==================== TOKEN MANAGEMENT ====================
const getToken = (): string | null => {
  return localStorage.getItem('biztrack_token');
};

const setToken = (token: string): void => {
  localStorage.setItem('biztrack_token', token);
};

const removeToken = (): void => {
  localStorage.removeItem('biztrack_token');
};

// ==================== CORE REQUEST ====================

export interface ApiRequestErrorShape {
  status?: number;
  code?: string;
  details?: string;
  data?: any;
  isNetworkError?: boolean;
}

export class ApiRequestError extends Error implements ApiRequestErrorShape {
  status?: number;
  code?: string;
  details?: string;
  data?: any;
  isNetworkError?: boolean;

  constructor(message: string, options: ApiRequestErrorShape = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.data = options.data;
    this.isNetworkError = options.isNetworkError;
  }
}

const isObject = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null;
};

const parseResponsePayload = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}));
  }

  const text = await response.text().catch(() => '');
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const createApiError = (response: Response, payload: any): ApiRequestError => {
  const normalizedPayload = isObject(payload) ? payload : {};

  const message =
    normalizedPayload.error ||
    normalizedPayload.message ||
    normalizedPayload.details ||
    `HTTP ${response.status}: ${response.statusText}`;

  return new ApiRequestError(message, {
    status: response.status,
    code: normalizedPayload.code,
    details: normalizedPayload.details,
    data: normalizedPayload,
  });
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

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      throw createApiError(response, payload);
    }

    return payload as T;
  } catch (error: any) {
    if (error instanceof ApiRequestError) {
      console.error('API request failed:', error);
      throw error;
    }

    // Handle network errors
    if (error?.name === 'TypeError' && String(error?.message || '').includes('fetch')) {
      const networkError = new ApiRequestError('Failed to fetch - Cannot connect to server', {
        isNetworkError: true,
      });
      throw networkError;
    }

    if (error instanceof Error) {
      throw new ApiRequestError(error.message);
    }

    console.error('API request failed:', error);
    throw new ApiRequestError('Unexpected API error');
  }
}

// ==================== RESOURCE APIs ====================

// Inventory API (with reorder functionality)
const inventoryAPIBase = {
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

export const inventoryAPI = {
  ...inventoryAPIBase,
  getCategories: () => apiRequest<{ categories: string[] }>('/inventory/categories'),
  createCategory: (name: string) => apiRequest<{ message: string; category: string }>('/inventory/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  getLowStock: (params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any[]>(`/inventory/low-stock${query}`);
  },
  updateReorderSettings: (id: string, data: any) => apiRequest<any>(`/inventory/${id}/reorder-settings`, {
    method: 'PUT',
    body: JSON.stringify(data),
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
  // New: Get suppliers for purchase creation
  getSuppliers: () => apiRequest<any>('/purchases/suppliers'),
  // Upcoming (pending) deliveries
  getUpcoming: () => apiRequest<any>('/purchases/upcoming'),
  processDeliveries: () => apiRequest<any>('/purchases/process-deliveries', {
    method: 'POST',
  }),
  // Khalti payment endpoints for purchases
  initiateKhaltiPayment: (data: { purchaseId?: string; amount?: number; purchaseOrderId?: string; supplierName?: string; supplierPhone?: string }) =>
    apiRequest<any>('/purchases/khalti/initiate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyKhaltiPayment: (pidx: string, context?: { purchaseId?: string; amount?: number }) =>
    apiRequest<any>('/purchases/khalti/verify', {
      method: 'POST',
      body: JSON.stringify({ pidx, ...(context || {}) }),
    }),
  getKhaltiBalance: () => apiRequest<any>('/purchases/khalti/balance'),
  initiateKhaltiInstallmentPayment: (data: { purchaseId: string; installmentIndex: number }) =>
    apiRequest<any>('/purchases/khalti/installment/initiate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyKhaltiInstallmentPayment: (data: { pidx: string; purchaseId: string; installmentIndex: number; amount: number }) =>
    apiRequest<any>('/purchases/khalti/installment/verify', {
      method: 'POST',
      body: JSON.stringify(data),
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
  recordPayment: (id: string, paymentData: { amount: number; date?: string; method: string; notes?: string } | { payments: { amount: number; date?: string; method: string; notes?: string }[] }) => apiRequest<any>(`/invoices/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData),
  }),
  sendEmail: (id: string, data?: { email?: string }) => apiRequest<any>(`/invoices/${id}/send-email`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
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
  googleLoginWithOTP: (credential: string) => apiRequest<any>('/users/google-login-otp', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  }),
  verifyOTP: (userId: string, otp: string) => apiRequest<any>('/users/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ userId, otp }),
  }),
  resendOTP: (userId: string) => apiRequest<any>('/users/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),
  toggle2FA: (id: string, enabled: boolean) => apiRequest<any>(`/users/${id}/toggle-2fa`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  }),
  updateStatus: (id: string, active: boolean) => apiRequest<any>(`/users/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ active }),
  }),
  update: (id: string, data: { username?: string; password?: string; role?: string }) => apiRequest<any>(`/users/${id}`, {
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

// Notifications API (Layout Bar - Temporary, max 7)
export const notificationsAPI = {
  getAll: (params?: { read?: boolean; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.read !== undefined) queryParams.append('read', params.read.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString();
    return apiRequest<{ notifications: any[]; totalCount: number; hasMore: boolean }>(`/notifications${query ? `?${query}` : ''}`);
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
  deleteAllExpiry: () => apiRequest<{ message: string; deletedFromTemp: number; deletedFromArchive: number; totalDeleted: number }>('/notifications/expiry/all', {
    method: 'DELETE',
  }),
};

// Notification Archive API (Settings Page - Permanent, all notifications)
export const notificationArchiveAPI = {
  getAll: (params?: { read?: boolean; limit?: number; skip?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.read !== undefined) queryParams.append('read', params.read.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    const query = queryParams.toString();
    return apiRequest<{ notifications: any[]; total: number }>(`/notifications/archive${query ? `?${query}` : ''}`);
  },
  getUnreadCount: () => apiRequest<{ count: number }>('/notifications/archive/unread/count'),
  getById: (id: string) => apiRequest<any>(`/notifications/archive/${id}`),
  markAsRead: (id: string) => apiRequest<any>(`/notifications/archive/${id}/read`, {
    method: 'PATCH',
  }),
  markAllAsRead: () => apiRequest<{ message: string; updatedCount: number }>('/notifications/archive/read/all', {
    method: 'PATCH',
  }),
  delete: (id: string) => apiRequest<{ message: string }>(`/notifications/archive/${id}`, {
    method: 'DELETE',
  }),
  deleteAllRead: () => apiRequest<{ message: string; deletedCount: number }>('/notifications/archive/read/all', {
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
  
  // Khalti payment endpoints
  getKhaltiBankList: () => apiRequest<{ success: boolean; banks: any[] }>('/billing/khalti/banks'),
  initiateKhaltiPayment: (data: any) => apiRequest<any>('/billing/khalti/initiate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  verifyKhaltiPayment: (pidx: string) => apiRequest<any>('/billing/khalti/verify', {
    method: 'POST',
    body: JSON.stringify({ pidx }),
  }),

  // eSewa payment endpoints
  initiateEsewaPayment: (data: any) => apiRequest<any>('/billing/esewa/initiate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  verifyEsewaPayment: (encodedResponse: string) => apiRequest<any>('/billing/esewa/verify', {
    method: 'POST',
    body: JSON.stringify({ encodedResponse }),
  }),
};

// AI Reports API
export const reportAIAPI = {
  chat: (data: { message: string; messages?: { role: 'user' | 'assistant'; content: string }[]; context?: any }) =>
    apiRequest<{ reply: string; model?: string; usage?: any }>('/ai/report-chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
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
  updateUser: (id: string, data: { username?: string; password?: string; role?: string }) => 
    usersAPI.update(id, data),
  getById: (id: string) => usersAPI.getById(id),
  getAll: () => usersAPI.getAll(),
};

// SaaS Onboarding API
export const saasAPI = {
  initiateGoogleSignup: (data: { credential: string; businessName: string; phone?: string; password: string; confirmPassword: string }) =>
    apiRequest<{ signupId: string; amount: number; paymentUrl: string; pidx: string }>(
      '/saas/signup/google/initiate',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
  verifyGoogleSignupPayment: (pidx: string) =>
    apiRequest<{ message: string; user: any; token: string; workspace: { businessName: string; ownerEmail: string } }>(
      '/saas/signup/google/verify',
      {
        method: 'POST',
        body: JSON.stringify({ pidx }),
      }
    ),
  initiateGoogleRenewal: (data: { credential: string }) =>
    apiRequest<{ paymentUrl: string; pidx: string; amount: number; signupId: string }>(
      '/saas/renew/google/initiate',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
  getClients: () => apiRequest<any[]>('/saas/clients'),
  freezeClient: (ownerId: string, frozen: boolean) =>
    apiRequest<{ message: string }>(`/saas/clients/${ownerId}/freeze`, {
      method: 'PATCH',
      body: JSON.stringify({ frozen }),
    }),
  deleteClient: (ownerId: string) =>
    apiRequest<{ message: string }>(`/saas/clients/${ownerId}`, {
      method: 'DELETE',
    }),
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
  
  recordLogout: (userId: string) => apiRequest<{
    message: string;
    sessionDuration: number;
    logoutRecord: any;
  }>('/login-history/logout', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),
  
  updateHeartbeat: (userId: string) => apiRequest<{
    message: string;
    lastActivity: string;
  }>('/login-history/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),
  
  autoLogoutInactiveSessions: () => apiRequest<{
    message: string;
    count: number;
  }>('/login-history/auto-logout', {
    method: 'POST',
  }),
};

// ==================== GENERIC CLIENT ====================

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

// Suppliers API
export const suppliersAPI = {
  getAll: (params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any>(`/suppliers${query}`);
  },
  getById: (id: string) => apiRequest<any>(`/suppliers/${id}`),
  create: (data: any) => apiRequest<any>('/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest<any>(`/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  activate: (id: string) => apiRequest<any>(`/suppliers/${id}/activate`, {
    method: 'PATCH',
  }),
  delete: (id: string) => apiRequest<{ message: string }>(`/suppliers/${id}`, {
    method: 'DELETE',
  }),
  permanentDelete: (id: string) => apiRequest<{ message: string }>(`/suppliers/${id}/permanent`, {
    method: 'DELETE',
  }),
  getProducts: (id: string) => apiRequest<any>(`/suppliers/${id}/products`),
  addProduct: (id: string, data: any) => apiRequest<any>(`/suppliers/${id}/products`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  removeProduct: (supplierId: string, inventoryId: string) => 
    apiRequest<{ message: string }>(`/suppliers/${supplierId}/products/${inventoryId}`, {
      method: 'DELETE',
    }),
  getPurchaseHistory: (id: string, params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any>(`/suppliers/${id}/purchase-history${query}`);
  },
};

// Customers API
export const customersAPI = {
  getAll: (params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any>(`/customers${query}`);
  },
  getById: (id: string) => apiRequest<any>(`/customers/${id}`),
  create: (data: any) => apiRequest<any>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest<any>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  activate: (id: string) => apiRequest<any>(`/customers/${id}/activate`, {
    method: 'PATCH',
  }),
  delete: (id: string) => apiRequest<{ message: string }>(`/customers/${id}`, {
    method: 'DELETE',
  }),
  permanentDelete: (id: string) => apiRequest<{ message: string }>(`/customers/${id}/permanent`, {
    method: 'DELETE',
  }),
  getPurchaseHistory: (id: string, params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any>(`/customers/${id}/purchase-history${query}`);
  },
  getRetentionAnalytics: (params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any>(`/customers/analytics/retention${query}`);
  },
};

// Reorder API
export const reorderAPI = {
  getLowStockReport: (params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any>(`/reorders/low-stock${query}`);
  },
  getAll: (params?: string) => {
    const query = params ? `?${params}` : '';
    return apiRequest<any>(`/reorders${query}`);
  },
  getById: (id: string) => apiRequest<any>(`/reorders/${id}`),
  create: (data: any) => apiRequest<any>('/reorders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createQuick: (data: any) => apiRequest<any>('/reorders/quick', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  approve: (id: string) => apiRequest<any>(`/reorders/${id}/approve`, {
    method: 'PUT',
  }),
  createPurchase: (reorderId: string, data: any) => apiRequest<any>(`/reorders/${reorderId}/purchase`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createBulk: (data: any) => apiRequest<any>('/reorders/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  cancel: (id: string) => apiRequest<any>(`/reorders/${id}/cancel`, {
    method: 'PUT',
  }),
  markReceived: (reorderId: string, data: any) => apiRequest<any>(`/reorders/${reorderId}/received`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getStats: () => apiRequest<any>('/reorders/stats'),
};

// Staff Analytics API
export const staffAnalyticsAPI = {
  getAnalytics: (params?: { days?: number; dateFrom?: string; dateTo?: string }) => {
    const q = new URLSearchParams();
    if (params?.dateFrom && params?.dateTo) {
      q.append('dateFrom', params.dateFrom);
      q.append('dateTo', params.dateTo);
    } else if (params?.days) {
      q.append('days', String(params.days));
    }
    const query = q.toString() ? `?${q.toString()}` : '';
    return apiRequest<any>(`/users/staff-analytics${query}`);
  },
};

export default api;
