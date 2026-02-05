const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  getLowStockItems,
  updateReorderSettings,
} = require("../controllers/inventoryController");
const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.get("/", getAllInventory);
router.get("/low-stock", getLowStockItems);
router.get("/:id", getInventoryById);
router.post("/", createInventory);
router.put("/:id", updateInventory);
router.put("/:id/reorder-settings", updateReorderSettings);
router.delete("/:id", deleteInventory);

module.exports = router;

