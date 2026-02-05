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
} = require("../controllers/purchaseController");
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.get("/", getAllPurchases);
router.get("/suppliers", getSuppliersForPurchase); // New route for suppliers
router.get("/:id", getPurchaseById);
router.post("/", createPurchase);
router.put("/:id", updatePurchase);
router.delete("/:id", deletePurchase);
router.post("/:id/payments", recordPayment);

module.exports = router;

