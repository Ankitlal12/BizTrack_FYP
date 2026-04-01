const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER, OWNER_ONLY } = require("../config/roles");
const {
  getLowStockReport, getReorderById, getAllReorders, createReorder,
  createQuickReorder, approveReorder, createPurchaseFromReorder,
  createBulkReorder, cancelReorder, markReorderReceived, getReorderStats,
} = require("../controllers/reorderController");

const router = express.Router();

// All reorder routes require authentication + owner/manager role
router.use(authenticate);
router.use(authorize(...OWNER_MANAGER));

router.get("/low-stock",              getLowStockReport);
router.get("/stats",                  getReorderStats);
router.get("/",                       getAllReorders);
router.get("/:id",                    getReorderById);
router.post("/",                      createReorder);
router.post("/quick",                 createQuickReorder);
router.post("/bulk",                  createBulkReorder);
router.put("/:id/approve",            approveReorder);
router.post("/:reorderId/purchase",   createPurchaseFromReorder);
router.put("/:id/cancel",             cancelReorder);
router.put("/:reorderId/received",    markReorderReceived);

module.exports = router;
