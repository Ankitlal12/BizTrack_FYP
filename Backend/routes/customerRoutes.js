const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerPurchaseHistory,
} = require("../controllers/customerController");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Customer CRUD routes
router.get("/", getAllCustomers);
router.get("/:id", getCustomerById);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

// Customer purchase history and payments
router.get("/:id/purchase-history", getCustomerPurchaseHistory);

module.exports = router;
