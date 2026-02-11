const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
  addProductToSupplier,
  removeProductFromSupplier,
  getSupplierPurchaseHistory,
} = require("../controllers/supplierController");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Supplier CRUD routes
router.get("/", getAllSuppliers);
router.get("/:id", getSupplierById);
router.post("/", createSupplier);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

// Supplier product management routes
router.get("/:id/products", getSupplierProducts);
router.post("/:id/products", addProductToSupplier);
router.delete("/:supplierId/products/:inventoryId", removeProductFromSupplier);

// Supplier purchase history and payments
router.get("/:id/purchase-history", getSupplierPurchaseHistory);

module.exports = router;