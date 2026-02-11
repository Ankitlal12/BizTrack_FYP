export interface Supplier {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contactPerson?: string;
  paymentTerms: 'immediate' | 'net15' | 'net30' | 'net45' | 'net60';
  averageLeadTimeDays: number;
  rating: number;
  isActive: boolean;
  notes?: string;
  products: SupplierProduct[];
  productCount?: number; // Count of inventory items linked to this supplier
  createdAt: string;
  updatedAt: string;
}

export interface SupplierProduct {
  inventoryId: string;
  supplierProductCode?: string;
  lastPurchasePrice?: number;
  minimumOrderQuantity: number;
}

export interface Reorder {
  _id: string;
  inventoryId: {
    _id: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    cost: number;
    stock: number;
  };
  supplierId?: {
    _id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
  };
  triggerType: 'auto' | 'manual' | 'out_of_stock';
  triggeredAt: string;
  triggeredBy: {
    userId: string;
    name: string;
    role: string;
  };
  stockAtTrigger: number;
  reorderLevel: number;
  suggestedQuantity: number;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  purchaseOrderId?: {
    _id: string;
    purchaseNumber: string;
    status: string;
  };
  orderedQuantity?: number;
  receivedQuantity?: number;
  resolvedAt?: string;
  resolvedBy?: {
    userId: string;
    name: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LowStockItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  reorderLevel: number;
  reorderQuantity?: number;
  maximumStock?: number;
  preferredSupplierId?: Supplier;
  supplierProductCode?: string;
  lastPurchasePrice?: number;
  reorderStatus: 'none' | 'needed' | 'pending' | 'ordered';
  pendingOrderId?: string;
  lastReorderDate?: string;
  averageDailySales?: number;
  leadTimeDays: number;
  safetyStock?: number;
  autoReorderEnabled: boolean;
  supplier: string;
  location: string;
  analytics: {
    suggestedQuantity: number;
    averageDailySales: number;
    currentStock: number;
    reorderLevel: number;
    daysUntilStockout: number;
    calculations: {
      totalSold90Days: number;
      annualDemand: number;
      safetyStock: number;
      leadTimeDays: number;
      reviewPeriod: number;
    };
  };
  priority: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
}

export interface ReorderStats {
  lowStockItems: number;
  outOfStockItems: number;
  pendingReorders: number;
  orderedReorders: number;
  estimatedReorderValue: number;
}

export interface ReorderFilters {
  category?: string;
  supplier?: string;
  urgency?: string;
  reorderStatus?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SupplierFilters {
  search?: string;
  isActive?: boolean;
}