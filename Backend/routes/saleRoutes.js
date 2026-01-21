const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale,
  recordPayment,
} = require("../controllers/saleController");
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.get("/", getAllSales);
router.get("/:id", getSaleById);
router.post("/", createSale);
router.put("/:id", updateSale);
router.delete("/:id", deleteSale);
router.post("/:id/payments", recordPayment);

module.exports = router;

