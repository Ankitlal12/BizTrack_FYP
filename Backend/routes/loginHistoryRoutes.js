const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const {
  getAllLoginHistory,
  getUserLoginHistory,
  recordLogin,
  getLoginStats,
  recordLogout,
} = require("../controllers/loginHistoryController");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all login history (admin/owner only)
router.get("/", authorize("owner", "manager"), getAllLoginHistory);

// Get login statistics (admin/owner only)
router.get("/stats", authorize("owner", "manager"), getLoginStats);

// Get login history for a specific user (admin/owner only)
router.get("/user/:userId", authorize("owner", "manager"), getUserLoginHistory);

// Record a login (internal use - called by auth system)
router.post("/record", recordLogin);

// Record a logout
router.post("/logout", recordLogout);

module.exports = router;