const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER, OWNER_ONLY, ALL_ROLES } = require("../config/roles");
const {
  getCategories, createCategory,
  getAllInventory, getInventoryById, createInventory, updateInventory,
  deleteInventory, getLowStockItems, updateReorderSettings, checkLowStock,
} = require("../controllers/inventoryController");

const router = express.Router();

// All inventory routes require authentication
router.use(authenticate);

// Category read-only: available to all roles for billing UI
router.get("/categories",                authorize(...ALL_ROLES), getCategories);
router.post("/categories",               authorize(...OWNER_MANAGER), createCategory);

// Other inventory endpoints: owner/manager only
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
