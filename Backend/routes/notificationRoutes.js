const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

// Get all notifications
router.get("/", notificationController.getAllNotifications);

// Get unread count - MUST come before /:id
router.get("/unread/count", notificationController.getUnreadCount);

// Mark all as read - MUST come before /:id/read
router.patch("/read/all", notificationController.markAllAsRead);

// Delete all read notifications - MUST come before /:id
router.delete("/read/all", notificationController.deleteAllRead);

// Create notification
router.post("/", notificationController.createNotification);

// Get single notification - parameterized routes MUST come after specific routes
router.get("/:id", notificationController.getNotificationById);

// Mark notification as read
router.patch("/:id/read", notificationController.markAsRead);

// Delete notification
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;


