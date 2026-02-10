const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getAllArchivedNotifications,
  getUnreadCount,
  getArchivedNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} = require("../controllers/notificationArchiveController");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all archived notifications (Settings page)
router.get("/", getAllArchivedNotifications);

// Get unread count - MUST come before /:id
router.get("/unread/count", getUnreadCount);

// Mark all as read - MUST come before /:id/read
router.patch("/read/all", markAllAsRead);

// Delete all read notifications permanently - MUST come before /:id
router.delete("/read/all", deleteAllRead);

// Get single archived notification - parameterized routes MUST come after specific routes
router.get("/:id", getArchivedNotificationById);

// Mark notification as read
router.patch("/:id/read", markAsRead);

// Permanently delete notification (Settings page only)
router.delete("/:id", deleteNotification);

module.exports = router;
