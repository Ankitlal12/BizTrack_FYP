export type PurchaseItem = {
  id?: string | number
  _id?: string
  inventoryId?: string
  name: string
  quantity: number
  cost: number
  total: number
  category?: string
}

export type PaymentRecord = {
  amount: number
  date: string | Date
  method: string
  notes?: string
}

export type Purchase = {
  _id?: string
  purchaseNumber: string
  supplierName: string
  supplierEmail?: string
  supplierPhone?: string
  items: PurchaseItem[]
  subtotal: number
  tax?: number
  shipping?: number
  total: number
  paymentMethod?: string
  paymentStatus?: 'unpaid' | 'partial' | 'paid'
  paidAmount?: number
  payments?: PaymentRecord[]
  status: 'pending' | 'received' | 'cancelled'
  expectedDeliveryDate?: string
  notes?: string
  createdAt?: string
}


