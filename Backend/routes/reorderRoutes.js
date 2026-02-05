const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getLowStockReport,
  getReorderById,
  getAllReorders,
  createReorder,
  createQuickReorder,
  approveReorder,
  createPurchaseFromReorder,
  createBulkReorder,
  cancelReorder,
  markReorderReceived,
  getReorderStats,
} = require("../controllers/reorderController");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Low stock and reorder routes
router.get("/low-stock", getLowStockReport);
router.get("/stats", getReorderStats);
router.get("/", getAllReorders);
router.get("/:id", getReorderById);

// Reorder management routes
router.post("/", createReorder);
router.post("/quick", createQuickReorder);
router.post("/bulk", createBulkReorder);
router.put("/:id/approve", approveReorder);
router.post("/:reorderId/purchase", createPurchaseFromReorder);
router.put("/:id/cancel", cancelReorder);
router.put("/:reorderId/received", markReorderReceived);

module.exports = router;