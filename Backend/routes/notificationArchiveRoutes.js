const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_ONLY } = require("../config/roles");
const {
  getAllArchivedNotifications, getUnreadCount, getArchivedNotificationById,
  markAsRead, markAllAsRead, deleteNotification, deleteAllRead,
} = require("../controllers/notificationArchiveController");

const router = express.Router();

// Notification archive is owner-only (Settings page)
router.use(authenticate);
router.use(authorize(...OWNER_ONLY));

router.get("/",              getAllArchivedNotifications);
router.get("/unread/count",  getUnreadCount);
router.patch("/read/all",    markAllAsRead);
router.delete("/read/all",   deleteAllRead);
router.get("/:id",           getArchivedNotificationById);
router.patch("/:id/read",    markAsRead);
router.delete("/:id",        deleteNotification);

module.exports = router;
