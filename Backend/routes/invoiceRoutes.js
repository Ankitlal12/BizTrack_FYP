const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER, OWNER_ONLY } = require("../config/roles");
const {
  getAllInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice,
  generateFromSale, generateFromPurchase, updatePaymentStatus,
  recordInvoicePayment, getInvoiceStats, sendInvoiceEmail,
} = require("../controllers/invoiceController");

const router = express.Router();

// All invoice routes require authentication + owner/manager role
router.use(authenticate);
router.use(authorize(...OWNER_MANAGER));

// Named routes before /:id
router.get("/",                              getAllInvoices);
router.get("/stats",                         getInvoiceStats);
router.post("/",                             createInvoice);
router.post("/generate/sale/:saleId",        generateFromSale);
router.post("/generate/purchase/:purchaseId", generateFromPurchase);

// Dynamic /:id routes
router.get("/:id",                           getInvoiceById);
router.put("/:id",                           updateInvoice);
router.patch("/:id/payment",                 updatePaymentStatus);
router.post("/:id/payments",                 recordInvoicePayment);
router.post("/:id/send-email",               sendInvoiceEmail);

// Delete — owner only
router.delete("/:id",                        authorize(...OWNER_ONLY), deleteInvoice);

module.exports = router;
