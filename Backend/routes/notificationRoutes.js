const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

// Get all notifications
router.get("/", notificationController.getAllNotifications);

// Get unread count
router.get("/unread/count", notificationController.getUnreadCount);

// Get single notification
router.get("/:id", notificationController.getNotificationById);

// Create notification
router.post("/", notificationController.createNotification);

// Mark notification as read
router.patch("/:id/read", notificationController.markAsRead);

// Mark all as read
router.patch("/read/all", notificationController.markAllAsRead);

// Delete notification
router.delete("/:id", notificationController.deleteNotification);

// Delete all read notifications
router.delete("/read/all", notificationController.deleteAllRead);

module.exports = router;


