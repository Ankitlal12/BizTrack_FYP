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
import { billingAPI, inventoryAPI } from '../../../services/api'
import { calculateTotals } from '../utils/billingUtils'
import { useAuth } from '../../../contexts/AuthContext'

const NEPAL_PHONE_REGEX = /^(97|98)\d{8}$/
const KHALTI_SANDBOX_MIN_RUPEES = 10
const KHALTI_SANDBOX_MAX_RUPEES = 1000000000000000000000000

const normalizeAmountToRupees = (amount: number): number => {
  if (!Number.isFinite(amount)) {
    return 0
  }
  return Math.round(amount * 100) / 100
}

const getKhaltiMode = (): 'sandbox' | 'live' => {
  const viteEnv = (import.meta as any)?.env || {}
  const explicitMode = String(viteEnv.VITE_KHALTI_MODE || '').toLowerCase()

  if (['sandbox', 'test', 'staging'].includes(explicitMode)) {
    return 'sandbox'
  }

  if (['live', 'production', 'prod'].includes(explicitMode)) {
    return 'live'
  }

  const gatewayUrl = String(viteEnv.VITE_KHALTI_GATEWAY_URL || '').toLowerCase()
  if (gatewayUrl.includes('test-pay.khalti.com')) {
    return 'sandbox'
  }
  if (gatewayUrl.includes('pay.khalti.com')) {
    return 'live'
  }

  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'sandbox'
  }

  return 'live'
}

const getSandboxAmountValidationMessage = (amountInRupees: number): string | null => {
  if (
    amountInRupees < KHALTI_SANDBOX_MIN_RUPEES ||
    amountInRupees > KHALTI_SANDBOX_MAX_RUPEES
  ) {
    return 'Test mode only supports Khalti payments between Rs 10 and Rs 100000000.'
  }
  return null
}

export const useBilling = () => {
  const { user } = useAuth()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchCustomer, setSearchCustomer] = useState('')
  const [searchProduct, setSearchProduct] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('khalti')
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
  const [categories, setCategories] = useState<string[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  const loadCustomers = async () => {
    try {
      setIsLoadingCustomers(true)
      const data = await billingAPI.getAllCustomers(searchCustomer || undefined)
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
      const data = await billingAPI.getBillingProducts(searchProduct || undefined)
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

  const loadCategories = async () => {
    try {
      const response = await inventoryAPI.getCategories()
      setCategories(response.categories || [])
    } catch (error: any) {
      console.error('Error loading categories:', error)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [searchCustomer])

  useEffect(() => {
    loadProducts()
  }, [searchProduct])

  useEffect(() => {
    loadCategories()
  }, [])

  const filteredCustomers = customers
  const filteredProducts = productsInventory

  const canCreateCustomer = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'staff'

  const handleOpenCustomerForm = () => {
    if (!canCreateCustomer) {
      toast.error('Access denied', {
        description: 'You do not have permission to add customers from billing.',
      })
      return
    }
    setShowCustomerForm(true)
  }

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
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveCustomer = async () => {
    if (!canCreateCustomer) {
      const message = 'You do not have permission to add customers from billing.'
      setValidationErrors({ general: message })
      toast.error('Access denied', { description: message })
      return
    }

    // Validate customer data
    const errors: ValidationErrors = {}
    if (!newCustomer.name.trim()) {
      errors.name = 'Name is required'
    }
    if (!newCustomer.phone.trim()) {
      errors.phone = 'Phone number is required'
    } else if (!NEPAL_PHONE_REGEX.test(newCustomer.phone.trim())) {
      errors.phone = 'Phone must be exactly 10 digits and start with 97 or 98'
    }
    if (newCustomer.email && !/\S+@\S+\.\S+/.test(newCustomer.email)) {
      errors.email = 'Invalid email format'
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
        setValidationErrors({ phone: errorMessage })
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

    if (paymentMethod === 'khalti') {
      const normalizedTotal = normalizeAmountToRupees(total)
      if (getKhaltiMode() === 'sandbox') {
        const sandboxValidationMessage = getSandboxAmountValidationMessage(normalizedTotal)
        if (sandboxValidationMessage) {
          setValidationErrors({ general: sandboxValidationMessage })
          toast.error('Invalid amount for test mode', {
            description: sandboxValidationMessage,
          })
          return
        }
      }
    }

    await handleKhaltiPayment()
  }

  const handleKhaltiPayment = async () => {
    setIsProcessing(true)
    let didRedirect = false

    try {
      const normalizedTotal = normalizeAmountToRupees(total)
      const isSandbox = getKhaltiMode() === 'sandbox'

      if (isSandbox) {
        const sandboxValidationMessage = getSandboxAmountValidationMessage(normalizedTotal)
        if (sandboxValidationMessage) {
          setValidationErrors({ general: sandboxValidationMessage })
          toast.error('Invalid amount for test mode', {
            description: sandboxValidationMessage,
          })
          return
        }
      }

      // Prepare Khalti payment data
      const khaltiData = {
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
        // Keep amount in rupees; backend Khalti service handles rupees to paisa conversion.
        total: normalizedTotal,
      }

      // Initiate Khalti payment
      const khaltiResponse = await billingAPI.initiateKhaltiPayment(khaltiData)
      const payableAmount = Number(khaltiResponse?.payableAmount ?? normalizedTotal)
      const remainingAmount = Math.max(0, normalizedTotal - payableAmount)

      if (khaltiResponse?.sandboxCapped && remainingAmount > 0) {
        toast.info('Sandbox payment limit applied', {
          description: `Khalti sandbox charged Rs ${payableAmount.toFixed(2)} now. Remaining Rs ${remainingAmount.toFixed(2)} will stay due.`,
        })
      }

      if (!khaltiResponse?.payment_url) {
        throw new Error('Khalti did not return a payment URL. Please try again.')
      }

      // Store sale data temporarily in localStorage for after payment
      const tempSaleData = {
        customerId: khaltiData.customerId,
        customer: khaltiData.customer,
        items: khaltiData.items,
        subtotal,
        tax,
        discount: 0,
        total: normalizedTotal,
        paymentMethod: 'khalti',
        paidAmount: payableAmount,
        notes,
        khaltiPidx: khaltiResponse.pidx,
        purchaseOrderId: khaltiResponse.purchaseOrderId,
      }

      localStorage.setItem('biztrack_pending_sale', JSON.stringify(tempSaleData))

      // Redirect to Khalti payment page
      didRedirect = true
      window.location.href = khaltiResponse.payment_url
    } catch (error: any) {
      console.error('Error initiating Khalti payment:', error)
      const errorMessage =
        error?.message ||
        error?.details ||
        'Failed to initiate Khalti payment. Please try again.'

      setValidationErrors({
        general: errorMessage,
      })

      toast.error('Khalti Payment Failed', {
        description: errorMessage,
      })
    } finally {
      if (!didRedirect) {
        setIsProcessing(false)
      }
    }
  }

  const handleStartNewSale = () => {
    setCartItems([])
    setSelectedCustomer(null)
    setPaymentMethod('khalti')
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
    categories,
    filteredCustomers,
    filteredProducts,
    subtotal,
    tax,
    total,
    isLoadingCustomers,
    isLoadingProducts,
    canCreateCustomer,
    // Actions
    setSelectedCustomer,
    setSearchCustomer,
    setSearchProduct,
    setShowCustomerForm,
    setNotes,
    setNewCustomer,
    setValidationErrors,
    handleOpenCustomerForm,
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
