import React from 'react'
import { SaveIcon, PrinterIcon } from 'lucide-react'
import { useBilling } from './Billing/hooks/useBilling'
import CustomerSelection from './Billing/components/CustomerSelection'
import CustomerForm from './Billing/components/CustomerForm'
import ProductSelection from './Billing/components/ProductSelection'
import ShoppingCart from './Billing/components/ShoppingCart'
import PaymentSection from './Billing/components/PaymentSelection'
import SaleReceipt from './Billing/components/SaleReceipt'
import Layout from '../layout/Layout'
const BillingSystem = () => {
  const {
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
    filteredCustomers,
    filteredProducts,
    subtotal,
    tax,
    total,
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
  } = useBilling()

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Billing System</h1>
        <div className="flex space-x-2">
          <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center">
            <SaveIcon size={18} className="mr-1" />
            Save
          </button>
          <button className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center">
            <PrinterIcon size={18} className="mr-1" />
            Print
          </button>
        </div>
      </div>
      {saleCompleted && saleData ? (
        <SaleReceipt
          saleData={saleData}
          paymentMethod={paymentMethod}
          onStartNewSale={handleStartNewSale}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Customer & Products */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                Customer Information
              </h2>
              {!selectedCustomer && !showCustomerForm ? (
                <CustomerSelection
                  searchCustomer={searchCustomer}
                  onSearchChange={setSearchCustomer}
                  filteredCustomers={filteredCustomers}
                  onSelectCustomer={setSelectedCustomer}
                  onNewCustomerClick={() => setShowCustomerForm(true)}
                  validationError={validationErrors.customer}
                />
              ) : showCustomerForm ? (
                <CustomerForm
                  newCustomer={newCustomer}
                  onCustomerChange={setNewCustomer}
                  onSave={handleSaveCustomer}
                  onCancel={() => {
                    setShowCustomerForm(false)
                    setValidationErrors({})
                  }}
                  validationErrors={validationErrors}
                />
              ) : selectedCustomer ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {selectedCustomer.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedCustomer.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedCustomer.phone}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="text-sm text-teal-600 hover:text-teal-900"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {/* Product Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                Add Products
              </h2>
              <ProductSelection
                searchProduct={searchProduct}
                onSearchChange={setSearchProduct}
                filteredProducts={filteredProducts}
                onAddToCart={addToCart}
                validationError={validationErrors.cart}
              />
            </div>
          </div>
          {/* Right Column - Cart & Checkout */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                Shopping Cart
              </h2>
              <ShoppingCart
                cartItems={cartItems}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
                subtotal={subtotal}
                tax={tax}
                total={total}
              />
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                Payment
              </h2>
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
      )}
    </div>
    </Layout>
  )
}

export default BillingSystem
