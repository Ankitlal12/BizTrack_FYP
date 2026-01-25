const express = require("express");
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  generateFromSale,
  generateFromPurchase,
  updatePaymentStatus,
  getInvoiceStats,
} = require("../controllers/invoiceController");
const router = express.Router();

// Basic CRUD routes
router.get("/", getAllInvoices);
router.get("/stats", getInvoiceStats);
router.get("/:id", getInvoiceById);
router.post("/", createInvoice);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);

// Invoice generation routes
router.post("/generate/sale/:saleId", generateFromSale);
router.post("/generate/purchase/:purchaseId", generateFromPurchase);

// Payment status update
router.patch("/:id/payment", updatePaymentStatus);

module.exports = router;

