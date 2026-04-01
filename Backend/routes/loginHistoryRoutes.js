const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER } = require("../config/roles");
const {
  getAllLoginHistory, getUserLoginHistory, recordLogin, getLoginStats,
  recordLogout, updateHeartbeat, autoLogoutInactiveSessions,
} = require("../controllers/loginHistoryController");

const router = express.Router();

router.use(authenticate);

// Owner + Manager: view history and stats
router.get("/",              authorize(...OWNER_MANAGER), getAllLoginHistory);
router.get("/stats",         authorize(...OWNER_MANAGER), getLoginStats);
router.get("/user/:userId",  authorize(...OWNER_MANAGER), getUserLoginHistory);
router.post("/auto-logout",  authorize(...OWNER_MANAGER), autoLogoutInactiveSessions);

// Any authenticated role: session management
router.post("/logout",       recordLogout);
router.post("/heartbeat",    updateHeartbeat);
router.post("/record",       recordLogin);

module.exports = router;
