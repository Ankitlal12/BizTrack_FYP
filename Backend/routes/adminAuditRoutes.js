const express = require("express");
const {
  getAuditLogs,
  getContactMessages,
  markMessageAsRead,
  dismissMessage,
  markAllMessagesAsRead,
  getUnreadMessageCount,
  getAuditLogDetails,
} = require("../controllers/adminAuditController");
const { verifyToken, extractTokenFromHeader } = require("../utils/jwt");

const router = express.Router();

// Middleware to verify admin access - must extract token from Authorization header
const verifyAdmin = (req, res, next) => {
  try {
    const authToken = extractTokenFromHeader(req.headers.authorization);
    if (!authToken) {
      return res.status(401).json({ error: "Token required." });
    }

    const decoded = verifyToken(authToken);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};

// Apply admin verification to all routes
router.use(verifyAdmin);

// Audit log routes - exact match first, then :logId
router.get("/logs", getAuditLogs);
router.get("/logs/:logId", getAuditLogDetails);

// Contact message routes - exact matches first
router.get("/messages/unread/count", getUnreadMessageCount);
router.get("/messages", getContactMessages);
router.patch("/messages/:messageId/read", markMessageAsRead);
router.patch("/messages/:messageId/dismiss", dismissMessage);
router.patch("/messages/read/all", markAllMessagesAsRead);

module.exports = router;
