export interface Customer {
  id: number | string
  name: string
  email: string
  phone: string
}

export interface Product {
  id: number | string
  name: string
  barcode: string
  price: number
  category: string
  stock: number
}

export interface CartItem {
  id: number | string
  name: string
  price: number
  quantity: number
  total: number
}

export interface SaleData {
  invoiceNumber: string
  date: string
  customer: Customer
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  notes: string
}

export interface ValidationErrors {
  customer?: string
  cart?: string
  payment?: string
  name?: string
  email?: string
  phone?: string
  general?: string
}

export interface NewCustomer {
  name: string
  email: string
  phone: string
}

