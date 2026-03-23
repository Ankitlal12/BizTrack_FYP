const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
  recordPayment,
  getSuppliersForPurchase,
  getUpcomingProducts,
  triggerDeliveryProcessing,
  initiateKhaltiPurchasePayment,
  verifyKhaltiPurchasePayment,
  getKhaltiBalance,
} = require("../controllers/purchaseController");
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.get("/", getAllPurchases);
router.get("/suppliers", getSuppliersForPurchase);
router.get("/upcoming", getUpcomingProducts);
router.post("/process-deliveries", triggerDeliveryProcessing);

// Khalti payment routes for purchases (must be before /:id)
router.post("/khalti/initiate", initiateKhaltiPurchasePayment);
router.post("/khalti/verify", verifyKhaltiPurchasePayment);
router.get("/khalti/balance", getKhaltiBalance);

router.get("/:id", getPurchaseById);
router.post("/", createPurchase);
router.put("/:id", updatePurchase);
router.delete("/:id", deletePurchase);
router.post("/:id/payments", recordPayment);

module.exports = router;

