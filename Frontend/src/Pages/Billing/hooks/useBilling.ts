import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Customer,
  Product,
  CartItem,
  SaleData,
  ValidationErrors,
  NewCustomer,
} from '../types'
import { billingAPI } from '../../../services/api'
import { calculateTotals } from '../utils/billingUtils'
import { useAuth } from '../../../contexts/AuthContext'

export const useBilling = () => {
  const { user } = useAuth()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  )
  const [searchCustomer, setSearchCustomer] = useState('')
  const [searchProduct, setSearchProduct] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paidAmount, setPaidAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [saleCompleted, setSaleCompleted] = useState(false)
  const [saleData, setSaleData] = useState<SaleData | null>(null)
  const [newCustomer, setNewCustomer] = useState<NewCustomer>({
    name: '',
    email: '',
    phone: '',
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [productsInventory, setProductsInventory] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  // Load customers from API on mount and when search changes
  useEffect(() => {
    loadCustomers()
  }, [searchCustomer])

  // Load products from API on mount and when search changes
  // This ensures all inventory items are displayed when the page loads
  useEffect(() => {
    loadProducts()
  }, [searchProduct])

  const loadCustomers = async () => {
    try {
      setIsLoadingCustomers(true)
      const data = await billingAPI.getAllCustomers(searchCustomer || undefined)
      // Transform API response to match Customer type
      const transformedCustomers: Customer[] = data.map((c: any) => ({
        id: c._id || c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
      }))
      setCustomers(transformedCustomers)
    } catch (error: any) {
      console.error('Error loading customers:', error)
      toast.error('Failed to load customers', {
        description: error.message || 'Please try again',
      })
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true)
      const data = await billingAPI.getBillingProducts(
        searchProduct || undefined,
      )
      // Transform API response to match Product type
      const transformedProducts: Product[] = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode || '',
        price: p.price,
        category: p.category || 'Uncategorized',
        stock: p.stock || 0,
      }))
      setProductsInventory(transformedProducts)
    } catch (error: any) {
      console.error('Error loading products:', error)
      toast.error('Failed to load products', {
        description: error.message || 'Please try again',
      })
    } finally {
      setIsLoadingProducts(false)
    }
  }

  // Filter customers based on search (now handled by API, but keeping for local filtering if needed)
  const filteredCustomers = customers

  // Filter products based on search (now handled by API, but keeping for local filtering if needed)
  const filteredProducts = productsInventory

  const addToCart = (product: Product) => {
    // Check if product has enough stock
    if (product.stock <= 0) {
      toast.error('This product is out of stock.')
      return
    }
    const existingItem = cartItems.find((item) => item.id === product.id)
    if (existingItem) {
      // Check if we have enough stock for the additional item
      if (existingItem.quantity + 1 > product.stock) {
        toast.error(`Only ${product.stock} units available in stock.`)
        return
      }
      setCartItems(
        cartItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price,
              }
            : item,
        ),
      )
    } else {
      setCartItems([
        ...cartItems,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          total: product.price,
        },
      ])
    }
  }

  const updateQuantity = (id: string | number, newQuantity: number) => {
    if (newQuantity <= 0) return
    // Find the product to check stock
    const product = productsInventory.find((p) => p.id === id)
    if (product && newQuantity > product.stock) {
      toast.error(`Only ${product.stock} units available in stock.`)
      return
    }
    setCartItems(
      cartItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: newQuantity,
              total: newQuantity * item.price,
            }
          : item,
      ),
    )
  }

  const removeItem = (id: string | number) => {
    setCartItems(cartItems.filter((item) => item.id !== id))
  }

  const { subtotal, tax, total } = calculateTotals(cartItems)

  const validateSale = (): boolean => {
    const errors: ValidationErrors = {}
    if (!selectedCustomer) {
      errors.customer = 'Please select a customer'
    }
    if (cartItems.length === 0) {
      errors.cart = 'Cart cannot be empty'
    }
    if (!paymentMethod) {
      errors.payment = 'Please select a payment method'
    }
    if (paidAmount < 0) {
      errors.paidAmount = 'Payment amount cannot be negative'
    }
    if (paidAmount > total) {
      errors.paidAmount = `Payment amount cannot exceed total amount of Rs ${total.toFixed(2)}`
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveCustomer = async () => {
    // Validate customer data
    const errors: ValidationErrors = {}
    if (!newCustomer.name.trim()) {
      errors.name = 'Name is required'
    }
    if (!newCustomer.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(newCustomer.email)) {
      errors.email = 'Invalid email format'
    }
    if (!newCustomer.phone.trim()) {
      errors.phone = 'Phone number is required'
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      setIsProcessing(true)
      const createdCustomer = await billingAPI.createCustomer(newCustomer)
      // Transform API response to match Customer type
      const customerToAdd: Customer = {
        id: createdCustomer._id || createdCustomer.id,
        name: createdCustomer.name,
        email: createdCustomer.email,
        phone: createdCustomer.phone,
      }
      setSelectedCustomer(customerToAdd)
      setShowCustomerForm(false)
      setValidationErrors({})
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
      })
      // Reload customers list
      await loadCustomers()
      toast.success('Customer created successfully')
    } catch (error: any) {
      console.error('Error creating customer:', error)
      const errorMessage =
        error.message || error.details || 'Failed to create customer'
      if (errorMessage.includes('already exists')) {
        setValidationErrors({ email: errorMessage })
      } else {
        setValidationErrors({ general: errorMessage })
      }
      toast.error('Failed to create customer', {
        description: errorMessage,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method)
  }

  const handleCompleteSale = async () => {
    // Validate the sale
    if (!validateSale()) {
      return
    }
    // Start processing
    setIsProcessing(true)
    try {
      // Prepare bill data for API
      const billData = {
        customerId: typeof selectedCustomer?.id === 'string' ? selectedCustomer.id : undefined,
        customer: selectedCustomer
          ? {
              name: selectedCustomer.name,
              email: selectedCustomer.email,
              phone: selectedCustomer.phone,
            }
          : undefined,
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        subtotal,
        tax,
        discount: 0,
        total,
        paymentMethod,
        paidAmount,
        notes,
      }

      // Create bill via API
      const createdSale = await billingAPI.createBill(billData)

      // Transform API response to SaleData format for receipt
      const completedSale: SaleData = {
        invoiceNumber: createdSale.invoiceNumber,
        date: createdSale.createdAt || new Date().toISOString(),
        customer: selectedCustomer!,
        items: cartItems,
        subtotal: createdSale.subtotal,
        tax: createdSale.tax,
        total: createdSale.total,
        paymentMethod: createdSale.paymentMethod,
        paidAmount: createdSale.paidAmount || paidAmount,
        notes: createdSale.notes || notes,
        createdBy: {
          name: user?.name || 'Unknown User',
          role: user?.role || 'staff',
        },
      }

      // Check for low stock items and show notifications
      const lowStockItems = createdSale.items?.filter(
        (item: any) => item.inventoryId?.stock < 5,
      )
      if (lowStockItems && lowStockItems.length > 0) {
        lowStockItems.forEach((item: any) => {
          const stock = item.inventoryId?.stock || 0
          if (stock === 0) {
            toast.error(`${item.name} is now out of stock!`, {
              description: 'Please reorder immediately',
              duration: 5000,
            })
          } else {
            toast.warning(`${item.name} is running low!`, {
              description: `Only ${stock} units remaining`,
              duration: 5000,
            })
          }
        })
      }

      // Set sale as completed and store sale data for receipt
      setSaleData(completedSale)
      setSaleCompleted(true)
      // Clear validation errors
      setValidationErrors({})
      // Reload products to reflect updated stock
      await loadProducts()
      toast.success('Sale completed successfully!', {
        description: `Invoice #${completedSale.invoiceNumber}`,
      })
    } catch (error: any) {
      console.error('Error completing sale:', error)
      const errorMessage =
        error.message || error.details || 'Failed to complete sale'
      setValidationErrors({
        general: errorMessage,
      })
      toast.error('Failed to complete sale', {
        description: errorMessage,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStartNewSale = () => {
    // Reset the form for a new sale
    setCartItems([])
    setSelectedCustomer(null)
    setPaymentMethod('cash')
    setPaidAmount(0)
    setNotes('')
    setSaleCompleted(false)
    setSaleData(null)
    setValidationErrors({})
  }

  const handlePaidAmountChange = (amount: number) => {
    setPaidAmount(amount)
  }

  return {
    // State
    selectedCustomer,
    searchCustomer,
    searchProduct,
    cartItems,
    showCustomerForm,
    paymentMethod,
    paidAmount,
    notes,
    saleCompleted,
    saleData,
    newCustomer,
    isProcessing,
    validationErrors,
    productsInventory,
    filteredCustomers,
    filteredProducts,
    subtotal,
    tax,
    total,
    isLoadingCustomers,
    isLoadingProducts,
    // Actions
    setSelectedCustomer,
    setSearchCustomer,
    setSearchProduct,
    setShowCustomerForm,
    setNotes,
    setNewCustomer,
    setValidationErrors,
    addToCart,
    updateQuantity,
    removeItem,
    handleSaveCustomer,
    handlePaymentMethodChange,
    handlePaidAmountChange,
    handleCompleteSale,
    handleStartNewSale,
    loadCustomers,
    loadProducts,
  }
}
