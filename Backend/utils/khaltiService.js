// ==================== IMPORTS ====================
const axios = require('axios');

// ==================== CONSTANTS ====================

/**
 * Two sandbox accounts are used:
 *  - KHALTI_SECRET_KEY           → billing/sales payments
 *  - KHALTI_PURCHASE_SECRET_KEY  → purchase/supplier payments
 * Docs: https://docs.khalti.com/khalti-epayment/
 */
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
const KHALTI_PURCHASE_SECRET_KEY =
  process.env.KHALTI_PURCHASE_SECRET_KEY ||
  process.env.KHALIT_PURCHASE_SECRET_KEY ||
  process.env.khalti_purchase_secret_key ||
  process.env.khalit_purchase_secret_key;
const KHALTI_GATEWAY_URL = process.env.KHALTI_GATEWAY_URL || 'https://dev.khalti.com/api/v2/epayment';
const KHALTI_RETURN_URL = process.env.KHALTI_RETURN_URL || 'http://localhost:5173/billing/payment-success';
const KHALTI_PURCHASE_RETURN_URL = process.env.KHALTI_PURCHASE_RETURN_URL || 'http://localhost:5173/purchases/payment-success';
const KHALTI_WEBSITE_URL = process.env.KHALTI_WEBSITE_URL || 'http://localhost:5173';

// ==================== HELPERS ====================

/**
 * Resolve the correct Khalti secret key based on payment type
 * @param {boolean} usePurchaseKey - Use purchase key instead of billing key
 * @returns {string}
 */
const resolveKhaltiSecretKey = (usePurchaseKey = false) => {
  if (usePurchaseKey) {
    if (!KHALTI_PURCHASE_SECRET_KEY) {
      throw new Error('Khalti purchase secret key is missing. Set KHALTI_PURCHASE_SECRET_KEY in Backend/.env');
    }
    return KHALTI_PURCHASE_SECRET_KEY;
  }
  if (!KHALTI_SECRET_KEY) {
    throw new Error('Khalti sales secret key is missing. Set KHALTI_SECRET_KEY in Backend/.env');
  }
  return KHALTI_SECRET_KEY;
};

/**
 * Get a user-friendly message for a Khalti payment status
 * @param {string} status
 * @returns {string}
 */
const getStatusMessage = (status) => {
  const messages = {
    'completed': 'Payment completed successfully',
    'pending': 'Payment is pending. Please wait.',
    'initiated': 'Payment initiated. Waiting for user action.',
    'refunded': 'Payment has been refunded',
    'partially refunded': 'Payment has been partially refunded',
    'expired': 'Payment link has expired',
    'user canceled': 'Payment was canceled by user',
  };
  return messages[status?.toLowerCase()] || 'Unknown payment status';
};

// ==================== PAYMENT FUNCTIONS ====================

/**
 * Initiate a Khalti payment
 * @param {Object} paymentData
 * @param {number} paymentData.amount - Amount in rupees
 * @param {string} paymentData.purchaseOrderId
 * @param {string} paymentData.purchaseOrderName
 * @param {Object} paymentData.customerInfo - { name, email, phone }
 * @param {Array}  paymentData.productDetails
 * @param {boolean} [paymentData.usePurchaseKey] - Use purchase secret key
 * @param {string}  [paymentData.returnUrl] - Override default return URL
 * @returns {Promise<Object>} { pidx, payment_url, expires_at, expires_in }
 */
const initiateKhaltiPayment = async (paymentData) => {
  try {
    const { amount, purchaseOrderId, purchaseOrderName, customerInfo, productDetails, usePurchaseKey } = paymentData;

    if (!amount || amount <= 0) throw new Error('Amount must be greater than 0');
    if (!purchaseOrderId) throw new Error('Purchase order ID is required');
    if (!customerInfo?.name || !customerInfo?.phone) throw new Error('Customer name and phone are required');

    const secretKey = resolveKhaltiSecretKey(Boolean(usePurchaseKey));
    const amountInPaisa = Math.round(amount * 100);

    const payload = {
      return_url: paymentData.returnUrl || (usePurchaseKey ? KHALTI_PURCHASE_RETURN_URL : KHALTI_RETURN_URL),
      website_url: KHALTI_WEBSITE_URL,
      amount: amountInPaisa,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: purchaseOrderName || 'BizTrack Sale',
      customer_info: {
        name: customerInfo.name,
        email: customerInfo.email || '',
        phone: customerInfo.phone,
      },
      merchant_username: 'BizTrack',
      merchant_extra: JSON.stringify({ app: 'BizTrack Inventory Management', version: '1.0' }),
    };

    if (productDetails?.length > 0) {
      payload.product_details = productDetails.map(product => ({
        identity: product.id || product.identity,
        name: product.name,
        total_price: Math.round(product.total_price * 100),
        quantity: product.quantity,
        unit_price: Math.round(product.unit_price * 100),
      }));
    }

    console.log('🔄 Initiating Khalti payment:', { amount: amountInPaisa, purchaseOrderId, customer: customerInfo.name });

    const response = await axios.post(`${KHALTI_GATEWAY_URL}/initiate/`, payload, {
      headers: { 'Authorization': `key ${secretKey}`, 'Content-Type': 'application/json' },
    });

    console.log('✅ Khalti payment initiated:', { pidx: response.data.pidx, payment_url: response.data.payment_url });

    return {
      success: true,
      pidx: response.data.pidx,
      payment_url: response.data.payment_url,
      expires_at: response.data.expires_at,
      expires_in: response.data.expires_in,
    };
  } catch (error) {
    console.error('❌ Khalti payment initiation failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || error.response?.data?.error_key || error.message || 'Failed to initiate Khalti payment');
  }
};

/**
 * Verify / lookup a Khalti payment status
 * @param {string} pidx - Payment identifier from Khalti
 * @param {boolean} [usePurchaseKey=false]
 * @returns {Promise<Object>} Payment status details
 */
const verifyKhaltiPayment = async (pidx, usePurchaseKey = false) => {
  try {
    if (!pidx) throw new Error('Payment identifier (pidx) is required');

    const secretKey = resolveKhaltiSecretKey(usePurchaseKey);

    console.log('🔍 Verifying Khalti payment:', pidx);

    const response = await axios.post(`${KHALTI_GATEWAY_URL}/lookup/`, { pidx }, {
      headers: { 'Authorization': `key ${secretKey}`, 'Content-Type': 'application/json' },
    });

    const data = response.data;
    const status = data.status?.toLowerCase();

    console.log('✅ Khalti verification response:', { pidx: data.pidx, status: data.status, transaction_id: data.transaction_id });

    return {
      success: status === 'completed',
      status: data.status,
      pidx: data.pidx,
      transaction_id: data.transaction_id,
      total_amount: data.total_amount / 100,  // paisa → rupees
      fee: data.fee / 100,
      refunded: data.refunded,
      isCompleted: status === 'completed',
      isPending: status === 'pending' || status === 'initiated',
      isRefunded: status === 'refunded' || status === 'partially refunded',
      isFailed: status === 'expired' || status === 'user canceled',
      message: getStatusMessage(status),
    };
  } catch (error) {
    console.error('❌ Khalti payment verification failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || error.response?.data?.error_key || error.message || 'Failed to verify Khalti payment');
  }
};

module.exports = {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  getStatusMessage,
};
