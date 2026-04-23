// ==================== IMPORTS ====================
const Notification = require("../models/Notification");
const NotificationArchive = require("../models/NotificationArchive");
const { dismissFromLayoutBar, createNotification: createNotificationHelper } = require("../utils/notificationHelper");
const tenantFilter = (req) => ({ tenantKey: req.user.tenantKey });

// ==================== READ ENDPOINTS ====================
exports.getAllNotifications = async (req, res) => {
  try {
    const { read } = req.query;
    const query = { ...tenantFilter(req) };
    
    if (read !== undefined) {
      query.read = read === 'true';
    }
    
    // Always limit to 7 for layout bar
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(7);
    
    // Get total count for "View all" indicator
    const totalCount = await Notification.countDocuments(query);
    
    res.json({
      notifications,
      totalCount,
      hasMore: totalCount > 7
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ ...tenantFilter(req), read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single notification
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== WRITE ENDPOINTS ====================

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const result = await createNotificationHelper({ ...req.body, tenantKey: req.user.tenantKey });
    res.status(201).json(result.temp); // Return the temp notification for backward compatibility
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Mark notification as read (syncs to both temp and archive)
exports.markAsRead = async (req, res) => {
  try {
    // Update in temp storage
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    // Also update in archive (same ID)
    await NotificationArchive.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      { read: true }
    );
    
    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Mark all as read (syncs to both temp and archive)
exports.markAllAsRead = async (req, res) => {
  try {
    // Get all unread notifications from temp storage
    const unreadNotifications = await Notification.find({ ...tenantFilter(req), read: false });
    const unreadIds = unreadNotifications.map(n => n._id);
    
    // Update in temp storage
    const result = await Notification.updateMany(
      { read: false },
      { read: true }
    );
    
    // Also update in archive (same IDs)
    await NotificationArchive.updateMany(
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

// Delete notification from layout bar (dismiss, but keep in archive)
exports.deleteNotification = async (req, res) => {
  try {
    await dismissFromLayoutBar(req.params.id, req.user.tenantKey);
    res.json({ message: "Notification dismissed from layout bar" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete all read notifications from layout bar
exports.deleteAllRead = async (req, res) => {
  try {
    const readNotifications = await Notification.find({ ...tenantFilter(req), read: true });
    
    // Dismiss each one (removes from layout bar, keeps in archive)
    await Promise.all(
      readNotifications.map(notif => dismissFromLayoutBar(notif._id.toString()))
    );
    
    res.json({ 
      message: "All read notifications dismissed from layout bar",
      deletedCount: readNotifications.length 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete all expiry-related notifications (both temp and archive)
exports.deleteAllExpiryNotifications = async (req, res) => {
  try {
    // Delete from temp storage
    const tempResult = await Notification.deleteMany({
      ...tenantFilter(req),
      type: { $in: ['expiring_soon', 'expired', 'subscription_expiring_soon', 'subscription_expired', 'subscription_renewed'] }
    });
    
    // Delete from archive
    const archiveResult = await NotificationArchive.deleteMany({
      ...tenantFilter(req),
      type: { $in: ['expiring_soon', 'expired', 'subscription_expiring_soon', 'subscription_expired', 'subscription_renewed'] }
    });
    
    res.json({ 
      message: "All expiry notifications deleted",
      deletedFromTemp: tempResult.deletedCount,
      deletedFromArchive: archiveResult.deletedCount,
      totalDeleted: tempResult.deletedCount + archiveResult.deletedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


