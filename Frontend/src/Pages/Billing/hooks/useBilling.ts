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
    await handleKhaltiPayment()
  }

  const handleKhaltiPayment = async () => {
    setIsProcessing(true);
    try {
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
        total,
      };

      // Initiate Khalti payment
      const khaltiResponse = await billingAPI.initiateKhaltiPayment(khaltiData);

      // Store sale data temporarily in localStorage for after payment
      const tempSaleData = {
        customerId: khaltiData.customerId,
        customer: khaltiData.customer,
        items: khaltiData.items,
        subtotal,
        tax,
        discount: 0,
        total,
        paymentMethod: 'khalti',
        paidAmount: total, // Full amount for Khalti
        notes,
        khaltiPidx: khaltiResponse.pidx,
        purchaseOrderId: khaltiResponse.purchaseOrderId,
      };
      
      localStorage.setItem('biztrack_pending_sale', JSON.stringify(tempSaleData));

      // Redirect to Khalti payment page
      window.location.href = khaltiResponse.payment_url;
    } catch (error: any) {
      console.error('Error initiating Khalti payment:', error);
      const errorMessage = error.message || 'Failed to initiate Khalti payment';
      setValidationErrors({
        general: errorMessage,
      });
      toast.error('Khalti Payment Failed', {
        description: errorMessage,
      });
      setIsProcessing(false);
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
