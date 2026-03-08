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
} = require("../controllers/purchaseController");
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.get("/", getAllPurchases);
router.get("/suppliers", getSuppliersForPurchase);
router.get("/upcoming", getUpcomingProducts); // Upcoming product deliveries
router.post("/process-deliveries", triggerDeliveryProcessing); // Manual trigger for delivery processing
router.get("/:id", getPurchaseById);
router.post("/", createPurchase);
router.put("/:id", updatePurchase);
router.delete("/:id", deletePurchase);
router.post("/:id/payments", recordPayment);

module.exports = router;

