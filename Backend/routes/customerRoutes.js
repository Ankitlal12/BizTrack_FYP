const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER, OWNER_ONLY } = require("../config/roles");
const {
  getAllCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer,
  getCustomerPurchaseHistory, getCustomerRetentionAnalytics,
} = require("../controllers/customerController");

const router = express.Router();

// All customer routes require authentication + owner/manager role
router.use(authenticate);
router.use(authorize(...OWNER_MANAGER));

router.get("/",                          getAllCustomers);
router.get("/analytics/retention",       getCustomerRetentionAnalytics);
router.get("/:id",                       getCustomerById);
router.post("/",                         createCustomer);
router.put("/:id",                       updateCustomer);
router.get("/:id/purchase-history",      getCustomerPurchaseHistory);

// Delete — owner only
router.delete("/:id",                    authorize(...OWNER_ONLY), deleteCustomer);

module.exports = router;
