// ==================== IMPORTS ====================
const axios = require('axios');

// ==================== CONSTANTS ====================

/**
 * Two sandbox accounts are used:
 *  - KHALTI_SECRET_KEY           → billing/sales payments
 *  - KHALTI_PURCHASE_SECRET_KEY  → purchase/supplier payments
 * Docs: https://docs.khalti.com/khalti-epayment/
 * 
 * IMPORTANT: According to Khalti API docs, payment method options (KHALTI, EBANKING, 
 * CONNECT_IPS, etc.) are controlled by Khalti's checkout page based on merchant account
 * settings. The API does NOT support specifying payment_preferences in the initiate request.
 */
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
const KHALTI_PURCHASE_SECRET_KEY =
  process.env.KHALTI_PURCHASE_SECRET_KEY ||
  process.env.KHALIT_PURCHASE_SECRET_KEY ||
  process.env.khalti_purchase_secret_key ||
  process.env.khalit_purchase_secret_key;
const KHALTI_GATEWAY_URL = process.env.KHALTI_GATEWAY_URL || 'https://dev.khalti.com/api/v2/epayment';
const KHALTI_PURCHASE_GATEWAY_URL = process.env.KHALTI_PURCHASE_GATEWAY_URL || '';
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
 * Check if a gateway URL is a sandbox/development gateway
 * @param {string} gatewayUrl
 * @returns {boolean}
 */
const isSandboxGateway = (gatewayUrl) => {
  return String(gatewayUrl || '').toLowerCase().includes('dev.khalti.com');
};

/**
 * Resolve the correct gateway URL based on payment type
 * @param {boolean} usePurchaseKey - Use purchase gateway URL if available
 * @returns {string}
 */
const resolveGatewayUrl = (usePurchaseKey = false) => {
  if (usePurchaseKey && KHALTI_PURCHASE_GATEWAY_URL && KHALTI_PURCHASE_GATEWAY_URL.trim()) {
    return KHALTI_PURCHASE_GATEWAY_URL.trim();
  }
  if (KHALTI_GATEWAY_URL && KHALTI_GATEWAY_URL.trim()) {
    return KHALTI_GATEWAY_URL.trim();
  }
  return 'https://dev.khalti.com/api/v2/epayment';
};

/**
 * Normalize payment URL based on gateway type
 * For sandbox: convert pay.khalti.com → test-pay.khalti.com
 * For live: convert test-pay.khalti.com → pay.khalti.com
 * @param {string} paymentUrl - URL from Khalti's initiate response
 * @param {string} gatewayUrl - The gateway URL being used
 * @returns {string} Corrected payment URL
 */
const normalizePaymentUrl = (paymentUrl, gatewayUrl) => {
  if (!paymentUrl) return paymentUrl;

  const isSandbox = isSandboxGateway(gatewayUrl);

  // For sandbox: convert live host to sandbox host
  if (isSandbox && paymentUrl.includes('https://pay.khalti.com')) {
    console.log('🔄 Converting live checkout host to sandbox:', 'pay.khalti.com → test-pay.khalti.com');
    return paymentUrl.replace('https://pay.khalti.com', 'https://test-pay.khalti.com');
  }

  // For production: convert sandbox host to live host
  if (!isSandbox && paymentUrl.includes('https://test-pay.khalti.com')) {
    console.log('🔄 Converting sandbox checkout host to live:', 'test-pay.khalti.com → pay.khalti.com');
    return paymentUrl.replace('https://test-pay.khalti.com', 'https://pay.khalti.com');
  }

  return paymentUrl;
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
 * @param {Array}  [paymentData.productDetails]
 * @param {boolean} [paymentData.usePurchaseKey] - Use purchase secret key
 * @param {string}  [paymentData.returnUrl] - Override default return URL
 * @returns {Promise<Object>} { pidx, payment_url, expires_at, expires_in }
 */
const initiateKhaltiPayment = async (paymentData) => {
  try {
    const { amount, purchaseOrderId, purchaseOrderName, customerInfo, productDetails, usePurchaseKey, returnUrl } = paymentData;

    if (!amount || amount <= 0) throw new Error('Amount must be greater than 0');
    if (!purchaseOrderId) throw new Error('Purchase order ID is required');
    if (!customerInfo?.name || !customerInfo?.phone) throw new Error('Customer name and phone are required');

    const secretKey = resolveKhaltiSecretKey(Boolean(usePurchaseKey));
    const gatewayUrl = resolveGatewayUrl(Boolean(usePurchaseKey));
    const amountInPaisa = Math.round(amount * 100);

    const payload = {
      return_url: returnUrl || (usePurchaseKey ? KHALTI_PURCHASE_RETURN_URL : KHALTI_RETURN_URL),
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

    console.log('🔄 Initiating Khalti payment:', { 
      amount, 
      purchaseOrderId, 
      customer: customerInfo.name,
      paymentType: usePurchaseKey ? 'Purchase' : 'Billing/Sale',
      gatewayUrl
    });

    const response = await axios.post(`${gatewayUrl}/initiate/`, payload, {
      headers: { 'Authorization': `key ${secretKey}`, 'Content-Type': 'application/json' },
    });

    // CRITICAL: Normalize payment URL for sandbox/live mismatch
    // Sandbox payments must use test-pay.khalti.com, not pay.khalti.com
    const normalizedPaymentUrl = normalizePaymentUrl(response.data.payment_url, gatewayUrl);

    console.log('✅ Khalti payment initiated:', { 
      pidx: response.data.pidx, 
      payment_url: normalizedPaymentUrl,
      expires_in: response.data.expires_in + ' seconds'
    });

    return {
      success: true,
      pidx: response.data.pidx,
      payment_url: normalizedPaymentUrl,
      expires_at: response.data.expires_at,
      expires_in: response.data.expires_in,
    };
  } catch (error) {
    console.error('❌ Khalti payment initiation failed:', {
      message: error.response?.data?.detail || error.response?.data || error.message,
      status: error.response?.status,
      paymentType: paymentData.usePurchaseKey ? 'Purchase' : 'Sale'
    });
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
    const gatewayUrl = resolveGatewayUrl(Boolean(usePurchaseKey));

    console.log('🔍 Verifying Khalti payment:', { pidx, paymentType: usePurchaseKey ? 'Purchase' : 'Billing/Sale' });

    const response = await axios.post(`${gatewayUrl}/lookup/`, { pidx }, {
      headers: { 'Authorization': `key ${secretKey}`, 'Content-Type': 'application/json' },
    });

    const data = response.data;
    const status = data.status?.toLowerCase();

    console.log('✅ Khalti verification response:', { 
      pidx: data.pidx, 
      status: data.status, 
      transaction_id: data.transaction_id 
    });

    return {
      success: status === 'completed',
      status: data.status,
      pidx: data.pidx,
      transaction_id: data.transaction_id,
      total_amount: Math.round(data.total_amount / 100), // paisa → rupees
      fee: Math.round((data.fee || 0) / 100),
      refunded: data.refunded || false,
      isCompleted: status === 'completed',
      isPending: status === 'pending' || status === 'initiated',
      isRefunded: status === 'refunded' || status === 'partially refunded',
      isFailed: status === 'expired' || status === 'user canceled',
      message: getStatusMessage(status),
    };
  } catch (error) {
    console.error('❌ Khalti payment verification failed:', {
      pidx,
      message: error.response?.data?.detail || error.response?.data || error.message,
      status: error.response?.status
    });
    throw new Error(error.response?.data?.detail || error.response?.data?.error_key || error.message || 'Failed to verify Khalti payment');
  }
};

module.exports = {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  getStatusMessage,
};
