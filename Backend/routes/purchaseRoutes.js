const express = require("express");
const {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
  recordPayment,
} = require("../controllers/purchaseController");
const router = express.Router();

router.get("/", getAllPurchases);
router.get("/:id", getPurchaseById);
router.post("/", createPurchase);
router.put("/:id", updatePurchase);
router.delete("/:id", deletePurchase);
router.post("/:id/payments", recordPayment);

module.exports = router;

