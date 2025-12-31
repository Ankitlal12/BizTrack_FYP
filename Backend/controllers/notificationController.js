const Notification = require("../models/Notification");

// Get all notifications
exports.getAllNotifications = async (req, res) => {
  try {
    const { read, limit = 50 } = req.query;
    const query = {};
    
    if (read !== undefined) {
      query.read = read === 'true';
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single notification
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { read: false },
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

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json({ message: "Notification deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete all read notifications
exports.deleteAllRead = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ read: true });
    res.json({ 
      message: "All read notifications deleted",
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


