const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER, OWNER_ONLY } = require("../config/roles");
const {
  getAllPurchases, getPurchaseById, createPurchase, updatePurchase,
  deletePurchase, recordPayment, getSuppliersForPurchase,
  getUpcomingProducts, triggerDeliveryProcessing,
  initiateKhaltiPurchasePayment, verifyKhaltiPurchasePayment,
  getKhaltiBalance, initiateKhaltiInstallmentPayment, verifyKhaltiInstallmentPayment,
} = require("../controllers/purchaseController");

const router = express.Router();

// All purchase routes require authentication + owner/manager role
router.use(authenticate);
router.use(authorize(...OWNER_MANAGER));

router.get("/",                              getAllPurchases);
router.get("/suppliers",                     getSuppliersForPurchase);
router.get("/upcoming",                      getUpcomingProducts);
router.get("/khalti/balance",                getKhaltiBalance);

// Khalti payment routes
router.post("/khalti/initiate",              initiateKhaltiPurchasePayment);
router.post("/khalti/verify",               verifyKhaltiPurchasePayment);
router.post("/khalti/installment/initiate", initiateKhaltiInstallmentPayment);
router.post("/khalti/installment/verify",   verifyKhaltiInstallmentPayment);

// Delivery processing — owner only
router.post("/process-deliveries",          authorize(...OWNER_ONLY), triggerDeliveryProcessing);

router.get("/:id",                           getPurchaseById);
router.post("/",                             createPurchase);
router.put("/:id",                           updatePurchase);
router.post("/:id/payments",                 recordPayment);

// Delete — owner only
router.delete("/:id",                        authorize(...OWNER_ONLY), deletePurchase);

module.exports = router;
