export type SaleItem = {
  id?: string | number
  _id?: string
  inventoryId?: string
  name: string
  quantity: number
  price: number
  total: number
}

export type Sale = {
  _id?: string
  id: string
  invoiceNumber?: string
  customer: {
    name: string
    email?: string
    phone?: string
  }
  items: SaleItem[]
  date: string
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'completed' | 'cancelled' | 'processing'
  paymentStatus: 'paid' | 'unpaid' | 'partial'
  paymentMethod: string
  notes?: string
}

