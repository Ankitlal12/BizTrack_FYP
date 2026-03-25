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
  recordInvoicePayment,
  getInvoiceStats,
  sendInvoiceEmail,
} = require("../controllers/invoiceController");
const router = express.Router();

// Static / named routes MUST come before dynamic /:id routes
router.get("/", getAllInvoices);
router.get("/stats", getInvoiceStats);
router.post("/", createInvoice);

// Invoice generation routes (before /:id to avoid route conflicts)
router.post("/generate/sale/:saleId", generateFromSale);
router.post("/generate/purchase/:purchaseId", generateFromPurchase);

// Dynamic /:id routes
router.get("/:id", getInvoiceById);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);
router.patch("/:id/payment", updatePaymentStatus);
router.post("/:id/payments", recordInvoicePayment);
router.post("/:id/send-email", sendInvoiceEmail);

module.exports = router;

