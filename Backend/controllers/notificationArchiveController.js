// ==================== IMPORTS ====================
const NotificationArchive = require("../models/NotificationArchive");
const Notification = require("../models/Notification");
const { permanentlyDeleteNotification } = require("../utils/notificationHelper");
const tenantFilter = (req) => ({ tenantKey: req.user.tenantKey });

// ==================== READ ENDPOINTS ====================
exports.getAllArchivedNotifications = async (req, res) => {
  try {
    const { read, limit = 25, skip = 0 } = req.query;
    const query = { ...tenantFilter(req) };
    
    if (read !== undefined) {
      query.read = read === 'true';
    }
    
    const [notifications, total] = await Promise.all([
      NotificationArchive.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit)),
      NotificationArchive.countDocuments(query),
    ]);
    
    res.json({ notifications, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get unread count from archive
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await NotificationArchive.countDocuments({ ...tenantFilter(req), read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single archived notification
exports.getArchivedNotificationById = async (req, res) => {
  try {
    const notification = await NotificationArchive.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark archived notification as read (syncs to temp storage)
exports.markAsRead = async (req, res) => {
  try {
    const notification = await NotificationArchive.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    // Also update in temp storage (same ID)
    await Notification.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      { read: true }
    );
    
    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Mark all archived notifications as read (syncs to temp storage)
exports.markAllAsRead = async (req, res) => {
  try {
    // Get all unread notifications from archive
    const unreadNotifications = await NotificationArchive.find({ ...tenantFilter(req), read: false });
    const unreadIds = unreadNotifications.map(n => n._id);
    
    // Update in archive
    const result = await NotificationArchive.updateMany(
      { read: false },
      { read: true }
    );
    
    // Also update in temp storage (same IDs)
    await Notification.updateMany(
      { _id: { $in: unreadIds } },
      { read: true }
    );
    
    res.json({ 
      message: "All notifications marked as read",
      updatedCount: result.modifiedCount 
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ==================== WRITE ENDPOINTS ====================

// Permanently delete notification (Settings page only)
exports.deleteNotification = async (req, res) => {
  try {
    await permanentlyDeleteNotification(req.params.id, req.user.tenantKey);
    res.json({ message: "Notification permanently deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete all read notifications permanently
exports.deleteAllRead = async (req, res) => {
  try {
    const readNotifications = await NotificationArchive.find({ ...tenantFilter(req), read: true });
    
    // Delete each one using the helper to ensure both storages are cleaned
    await Promise.all(
      readNotifications.map(notif => permanentlyDeleteNotification(notif._id.toString()))
    );
    
    res.json({ 
      message: "All read notifications permanently deleted",
      deletedCount: readNotifications.length 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
