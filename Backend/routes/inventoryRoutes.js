const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER, OWNER_ONLY } = require("../config/roles");
const {
  getAllInventory, getInventoryById, createInventory, updateInventory,
  deleteInventory, getLowStockItems, updateReorderSettings, checkLowStock,
} = require("../controllers/inventoryController");

const router = express.Router();

// All inventory routes require authentication + owner/manager role
router.use(authenticate);
router.use(authorize(...OWNER_MANAGER));

router.get("/",                          getAllInventory);
router.get("/low-stock",                 getLowStockItems);
router.get("/:id",                       getInventoryById);
router.post("/",                         createInventory);
router.put("/:id",                       updateInventory);
router.put("/:id/reorder-settings",      updateReorderSettings);

// Delete + low-stock check — owner only
router.delete("/:id",                    authorize(...OWNER_ONLY), deleteInventory);
router.post("/check-low-stock",          authorize(...OWNER_ONLY), checkLowStock);

module.exports = router;
