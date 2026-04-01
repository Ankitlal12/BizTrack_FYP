const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER, OWNER_ONLY } = require("../config/roles");
const {
  getAllSales, getSaleById, createSale, updateSale, deleteSale, recordPayment,
} = require("../controllers/saleController");

const router = express.Router();

// All sale routes require authentication + owner/manager role
router.use(authenticate);
router.use(authorize(...OWNER_MANAGER));

router.get("/",           getAllSales);
router.get("/:id",        getSaleById);
router.post("/",          createSale);
router.put("/:id",        updateSale);
router.post("/:id/payments", recordPayment);

// Delete — owner only
router.delete("/:id",     authorize(...OWNER_ONLY), deleteSale);

module.exports = router;
