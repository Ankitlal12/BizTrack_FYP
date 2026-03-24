const axios = require('axios');

/**
 * Khalti Payment Gateway Service
 * Documentation: https://docs.khalti.com/khalti-epayment/
 *
 * Two sandbox accounts are used:
 *  - KHALTI_SECRET_KEY           → billing/sales payments
 *  - KHALTI_PURCHASE_SECRET_KEY  → purchase/supplier payments
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

const resolveKhaltiSecretKey = (usePurchaseKey = false) => {
  if (usePurchaseKey) {
    if (!KHALTI_PURCHASE_SECRET_KEY) {
      throw new Error('Khalti purchase secret key is missing. Set KHALTI_PURCHASE_SECRET_KEY or khalit_purchase_secret_key in Backend/.env');
    }
    return KHALTI_PURCHASE_SECRET_KEY;
  }

  if (!KHALTI_SECRET_KEY) {
    throw new Error('Khalti sales secret key is missing. Set KHALTI_SECRET_KEY in Backend/.env');
  }

  return KHALTI_SECRET_KEY;
};

/**
 * Initiate Khalti payment
 * @param {Object} paymentData - Payment information
 * @returns {Promise<Object>} - Payment initiation response with pidx and payment_url
 */
const initiateKhaltiPayment = async (paymentData) => {
  try {
    const {
      amount,
      purchaseOrderId,
      purchaseOrderName,
      customerInfo,
      productDetails,
      // Pass usePurchaseKey: true when paying a supplier/purchase
      usePurchaseKey,
    } = paymentData;

    const secretKey = resolveKhaltiSecretKey(Boolean(usePurchaseKey));

    // Validate required fields
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!purchaseOrderId) {
      throw new Error('Purchase order ID is required');
    }

    if (!customerInfo || !customerInfo.name || !customerInfo.phone) {
      throw new Error('Customer name and phone are required');
    }

    // Amount must be in paisa (1 rupee = 100 paisa)
    const amountInPaisa = Math.round(amount * 100);

    // Prepare request payload
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
    };

    // Add product details if provided
    if (productDetails && productDetails.length > 0) {
      payload.product_details = productDetails.map(product => ({
        identity: product.id || product.identity,
        name: product.name,
        total_price: Math.round(product.total_price * 100), // Convert to paisa
        quantity: product.quantity,
        unit_price: Math.round(product.unit_price * 100), // Convert to paisa
      }));
    }

    // Add merchant metadata
    payload.merchant_username = 'BizTrack';
    payload.merchant_extra = JSON.stringify({
      app: 'BizTrack Inventory Management',
      version: '1.0',
    });

    console.log('🔄 Initiating Khalti payment:', {
      amount: amountInPaisa,
      purchaseOrderId,
      customer: customerInfo.name,
    });

    // Make API request to Khalti
    const response = await axios.post(
      `${KHALTI_GATEWAY_URL}/initiate/`,
      payload,
      {
        headers: {
          'Authorization': `key ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Khalti payment initiated successfully');
    console.log('   pidx:', response.data.pidx);
    console.log('   payment_url:', response.data.payment_url);

    return {
      success: true,
      pidx: response.data.pidx,
      payment_url: response.data.payment_url,
      expires_at: response.data.expires_at,
      expires_in: response.data.expires_in,
    };
  } catch (error) {
    console.error('❌ Khalti payment initiation failed:', error.response?.data || error.message);
    
    if (error.response?.data) {
      throw new Error(error.response.data.detail || error.response.data.error_key || 'Khalti payment initiation failed');
    }
    
    throw new Error(error.message || 'Failed to initiate Khalti payment');
  }
};

/**
 * Verify/Lookup Khalti payment status
 * @param {string} pidx - Payment identifier from Khalti
 * @param {boolean} [usePurchaseKey=false] - Use purchase secret key instead of billing key
 * @returns {Promise<Object>} - Payment verification response
 */
const verifyKhaltiPayment = async (pidx, usePurchaseKey = false) => {
  try {
    if (!pidx) {
      throw new Error('Payment identifier (pidx) is required');
    }

    const secretKey = resolveKhaltiSecretKey(usePurchaseKey);

    console.log('🔍 Verifying Khalti payment:', pidx);

    // Make API request to Khalti lookup endpoint
    const response = await axios.post(
      `${KHALTI_GATEWAY_URL}/lookup/`,
      { pidx },
      {
        headers: {
          'Authorization': `key ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const paymentData = response.data;

    console.log('✅ Khalti payment verification response:', {
      pidx: paymentData.pidx,
      status: paymentData.status,
      transaction_id: paymentData.transaction_id,
      total_amount: paymentData.total_amount,
    });

    // Parse status
    const status = paymentData.status?.toLowerCase();
    const isCompleted = status === 'completed';
    const isPending = status === 'pending' || status === 'initiated';
    const isRefunded = status === 'refunded' || status === 'partially refunded';
    const isFailed = status === 'expired' || status === 'user canceled';

    return {
      success: isCompleted,
      status: paymentData.status,
      pidx: paymentData.pidx,
      transaction_id: paymentData.transaction_id,
      total_amount: paymentData.total_amount / 100, // Convert from paisa to rupees
      fee: paymentData.fee / 100, // Convert from paisa to rupees
      refunded: paymentData.refunded,
      isCompleted,
      isPending,
      isRefunded,
      isFailed,
      message: getStatusMessage(status),
    };
  } catch (error) {
    console.error('❌ Khalti payment verification failed:', error.response?.data || error.message);
    
    if (error.response?.data) {
      throw new Error(error.response.data.detail || error.response.data.error_key || 'Khalti payment verification failed');
    }
    
    throw new Error(error.message || 'Failed to verify Khalti payment');
  }
};

/**
 * Get user-friendly status message
 * @param {string} status - Payment status from Khalti
 * @returns {string} - User-friendly message
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

module.exports = {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  getStatusMessage,
};
