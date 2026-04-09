const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER } = require("../config/roles");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

// Notification routes are accessible by owner + manager
router.use(authenticate);
router.use(authorize(...OWNER_MANAGER));

// Named routes before /:id
router.get("/",                  notificationController.getAllNotifications);
router.get("/unread/count",      notificationController.getUnreadCount);
router.patch("/read/all",        notificationController.markAllAsRead);
router.delete("/read/all",       notificationController.deleteAllRead);
router.delete("/expiry/all",     notificationController.deleteAllExpiryNotifications);
router.post("/",                 notificationController.createNotification);

// Dynamic /:id routes
router.get("/:id",               notificationController.getNotificationById);
router.patch("/:id/read",        notificationController.markAsRead);
router.delete("/:id",            notificationController.deleteNotification);

module.exports = router;
