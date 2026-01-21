const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  // Customer endpoints
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  // Product endpoints
  getBillingProducts,
  getBillingProductById,
  // Billing endpoints
  createBill,
  getAllBills,
  getBillById,
} = require("../controllers/billingController");
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Customer routes
router.get("/customers", getAllCustomers);
router.get("/customers/:id", getCustomerById);
router.post("/customers", createCustomer);
router.put("/customers/:id", updateCustomer);
router.delete("/customers/:id", deleteCustomer);

// Product routes for billing
router.get("/products", getBillingProducts);
router.get("/products/:id", getBillingProductById);

// Billing/Sale routes
router.post("/bills", createBill);
router.get("/bills", getAllBills);
router.get("/bills/:id", getBillById);

module.exports = router;



