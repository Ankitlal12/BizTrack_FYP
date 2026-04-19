const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER, OWNER_ONLY, ALL_ROLES } = require("../config/roles");
const {
  getAllCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer,
  getBillingProducts, getBillingProductById,
  createBill, getAllBills, getBillById,
  initiateKhaltiPayment, verifyKhaltiPayment, getKhaltiBankList,
} = require("../controllers/billingController");

const router = express.Router();

// All billing routes require authentication
router.use(authenticate);

// ── Products (read-only for all roles — staff needs to see products to bill) ──
router.get("/products",          authorize(...ALL_ROLES), getBillingProducts);
router.get("/products/:id",      authorize(...ALL_ROLES), getBillingProductById);

// ── Bills (all roles can create and view bills) ──
router.post("/bills",            authorize(...ALL_ROLES), createBill);
router.get("/bills",             authorize(...ALL_ROLES), getAllBills);
router.get("/bills/:id",         authorize(...ALL_ROLES), getBillById);

// ── Khalti (all roles — staff uses Khalti to complete billing) ──
router.get("/khalti/banks",      authorize(...ALL_ROLES), getKhaltiBankList);
router.post("/khalti/initiate",  authorize(...ALL_ROLES), initiateKhaltiPayment);
router.post("/khalti/verify",    authorize(...ALL_ROLES), verifyKhaltiPayment);

// ── Customer read (all roles — staff needs to select customers) ──
router.get("/customers",         authorize(...ALL_ROLES), getAllCustomers);
router.get("/customers/:id",     authorize(...ALL_ROLES), getCustomerById);

// ── Customer write (all roles can create from billing; management actions stay restricted) ──
router.post("/customers",        authorize(...ALL_ROLES), createCustomer);
router.put("/customers/:id",     authorize(...OWNER_MANAGER), updateCustomer);
router.delete("/customers/:id",  authorize(...OWNER_ONLY),    deleteCustomer);

module.exports = router;
