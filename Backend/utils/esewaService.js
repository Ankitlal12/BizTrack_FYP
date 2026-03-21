const crypto = require('crypto');
const axios = require('axios');

/**
 * eSewa Payment Gateway Service
 * Using eSewa ePay v2 (form-based redirect flow)
 * Test credentials from .env
 */

const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_GATEWAY_URL = process.env.ESEWA_GATEWAY_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_STATUS_URL = process.env.ESEWA_STATUS_URL || 'https://rc.esewa.com.np/api/epay/transaction/status/';
const ESEWA_SUCCESS_URL = process.env.ESEWA_SUCCESS_URL || 'http://localhost:5173/billing/esewa-success';
const ESEWA_FAILURE_URL = process.env.ESEWA_FAILURE_URL || 'http://localhost:5173/billing/esewa-failure';

/**
 * Generate HMAC-SHA256 signature for eSewa
 * Signed string: total_amount,transaction_uuid,product_code
 */
const generateSignature = (totalAmount, transactionUuid) => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_MERCHANT_CODE}`;
  return crypto
    .createHmac('sha256', ESEWA_SECRET_KEY)
    .update(message)
    .digest('base64');
};

/**
 * Verify callback payload signature from eSewa redirect
 * eSewa sends: signed_field_names + signature in base64-encoded response body
 */
const verifyResponseSignature = (decodedResponse) => {
  try {
    const { signed_field_names, signature } = decodedResponse || {};

    if (!signed_field_names || !signature) {
      return false;
    }

    const fields = signed_field_names
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);

    const message = fields
      .map((field) => `${field}=${decodedResponse[field] ?? ''}`)
      .join(',');

    const calculated = crypto
      .createHmac('sha256', ESEWA_SECRET_KEY)
      .update(message)
      .digest('base64');

    return calculated === signature;
  } catch (error) {
    console.error('eSewa response signature verification failed:', error.message);
    return false;
  }
};

/**
 * Build eSewa payment form parameters
 * Returns the gateway URL + all form fields to POST
 */
const buildEsewaPaymentParams = ({ amount, transactionUuid, productName }) => {
  const totalAmount = parseFloat(amount).toFixed(2);
  const signature = generateSignature(totalAmount, transactionUuid);

  return {
    gatewayUrl: ESEWA_GATEWAY_URL,
    fields: {
      amount: totalAmount,
      tax_amount: '0',
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_MERCHANT_CODE,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: ESEWA_SUCCESS_URL,
      failure_url: ESEWA_FAILURE_URL,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    },
  };
};

/**
 * Verify eSewa payment status via status check API
 * Called after user is redirected back with encoded response
 */
const verifyEsewaPayment = async ({ totalAmount, transactionUuid }) => {
  try {
    const url = `${ESEWA_STATUS_URL}?product_code=${ESEWA_MERCHANT_CODE}&total_amount=${totalAmount}&transaction_uuid=${transactionUuid}`;
    const response = await axios.get(url);
    const data = response.data;

    console.log('eSewa status check response:', data);

    const isCompleted = data.status === 'COMPLETE';
    return {
      success: isCompleted,
      status: data.status,
      transactionUuid: data.transaction_uuid,
      totalAmount: data.total_amount,
      refId: data.ref_id,
      message: isCompleted ? 'Payment completed successfully' : `Payment status: ${data.status}`,
    };
  } catch (error) {
    console.error('eSewa verification error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to verify eSewa payment');
  }
};

module.exports = { buildEsewaPaymentParams, verifyEsewaPayment, generateSignature, verifyResponseSignature };
