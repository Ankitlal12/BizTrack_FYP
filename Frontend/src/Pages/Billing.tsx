import React from 'react'
import {
  User, Package, ShoppingCart, CreditCard,
  CheckCircle, UserCheck, X, Receipt,
} from 'lucide-react'
import { useBilling } from './Billing/hooks/useBilling'
import CustomerSelection from './Billing/components/CustomerSelection'
import CustomerForm from './Billing/components/CustomerForm'
import ProductSelection from './Billing/components/ProductSelection'
import ShoppingCartPanel from './Billing/components/ShoppingCart'
import PaymentSection from './Billing/components/PaymentSelection'
import SaleReceipt from './Billing/components/SaleReceipt'
import Layout from '../layout/Layout'

const BillingSystem = () => {
  const {
    selectedCustomer, searchCustomer, searchProduct,
    cartItems, showCustomerForm, paymentMethod, paidAmount,
    notes, saleCompleted, saleData, newCustomer,
    isProcessing, validationErrors, filteredCustomers,
    filteredProducts, categories, subtotal, total, canCreateCustomer,
    setSelectedCustomer, setSearchCustomer, setSearchProduct,
    setShowCustomerForm, setNotes, setNewCustomer, setValidationErrors,
    handleOpenCustomerForm,
    addToCart, updateQuantity, removeItem, handleSaveCustomer,
    handlePaymentMethodChange, handlePaidAmountChange,
    handleCompleteSale, handleStartNewSale,
  } = useBilling()

  if (saleCompleted && saleData) {
    return (
      <Layout>
        <SaleReceipt saleData={saleData} paymentMethod={paymentMethod} onStartNewSale={handleStartNewSale} />
      </Layout>
    )
  }

  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <Layout>
      {/*
        Full-height POS layout:
        - Left panel (scrollable): customer picker + product grid
        - Right panel (fixed height): cart + payment always visible
      */}
      <div className="flex gap-5 h-[calc(100vh-7rem)]">

        {/* ══════════════════════════════════════════
            LEFT PANEL — Customer + Products
        ══════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0 pr-1">

          {/* Page title */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-600" />
                New Sale
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Fill in customer and products, then pay on the right</p>
            </div>
          </div>

          {/* ── STEP 1: Customer ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-shrink-0">
            {/* Card header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                selectedCustomer ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {selectedCustomer ? <CheckCircle className="w-4 h-4" /> : <User className="w-3.5 h-3.5" />}
              </div>
              <span className="text-sm font-semibold text-gray-800">Customer</span>
              {selectedCustomer && (
                <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                  <UserCheck className="w-3.5 h-3.5" />
                  {selectedCustomer.name}
                </span>
              )}
            </div>

            {/* Card body */}
            <div className="p-5">
              {selectedCustomer && !showCustomerForm ? (
                /* Selected state */
                <div className="flex items-center gap-3 p-3.5 bg-teal-50 border border-teal-200 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-base">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{selectedCustomer.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedCustomer.phone}
                      {selectedCustomer.email ? <span className="text-gray-400"> · {selectedCustomer.email}</span> : null}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Change
                  </button>
                </div>
              ) : showCustomerForm ? (
                <CustomerForm
                  newCustomer={newCustomer}
                  onCustomerChange={setNewCustomer}
                  onSave={handleSaveCustomer}
                  onCancel={() => { setShowCustomerForm(false); setValidationErrors({}) }}
                  validationErrors={validationErrors}
                />
              ) : (
                <CustomerSelection
                  searchCustomer={searchCustomer}
                  onSearchChange={setSearchCustomer}
                  filteredCustomers={filteredCustomers}
                  onSelectCustomer={setSelectedCustomer}
                  onNewCustomerClick={handleOpenCustomerForm}
                  canCreateCustomer={canCreateCustomer}
                  validationError={validationErrors.customer}
                />
              )}
            </div>
          </div>

          {/* ── STEP 2: Products ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0">
            {/* Card header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                cartItems.length > 0 ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {cartItems.length > 0
                  ? <CheckCircle className="w-4 h-4" />
                  : <Package className="w-3.5 h-3.5" />
                }
              </div>
              <span className="text-sm font-semibold text-gray-800">Products</span>
              {cartItems.length > 0 && (
                <span className="ml-auto text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                  {itemCount} item{itemCount !== 1 ? 's' : ''} in cart
                </span>
              )}
            </div>

            {/* Card body — fills remaining height */}
            <div className="p-5 flex-1 overflow-hidden flex flex-col min-h-0">
              <ProductSelection
                searchProduct={searchProduct}
                onSearchChange={setSearchProduct}
                filteredProducts={filteredProducts}
                categories={categories}
                onAddToCart={addToCart}
                validationError={validationErrors.cart}
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            RIGHT PANEL — Cart + Payment (fixed)
        ══════════════════════════════════════════ */}
        <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col gap-4 h-full">

          {/* Cart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                cartItems.length > 0 ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Cart</span>
              {cartItems.length > 0 && (
                <span className="ml-auto text-sm font-bold text-gray-900">
                  Rs {total.toFixed(2)}
                </span>
              )}
            </div>
            <div className="p-4 flex-1 overflow-hidden flex flex-col min-h-0">
              <ShoppingCartPanel
                cartItems={cartItems}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
                subtotal={subtotal}
                total={total}
              />
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
              <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Payment</span>
            </div>
            <div className="p-4">
              <PaymentSection
                paymentMethod={paymentMethod}
                onPaymentMethodChange={handlePaymentMethodChange}
                paidAmount={paidAmount}
                onPaidAmountChange={handlePaidAmountChange}
                totalAmount={total}
                notes={notes}
                onNotesChange={setNotes}
                validationErrors={validationErrors}
                isProcessing={isProcessing}
                onCompleteSale={handleCompleteSale}
                isDisabled={cartItems.length === 0 || !selectedCustomer}
              />
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}

export default BillingSystem
