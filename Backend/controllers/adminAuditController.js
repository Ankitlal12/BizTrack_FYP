const AdminAuditLog = require("../models/AdminAuditLog");
const AdminContactMessage = require("../models/AdminContactMessage");
const User = require("../models/User");

// Utility function to create audit log entry
exports.logAdminAction = async (auditData) => {
  try {
    await AdminAuditLog.create(auditData);
  } catch (error) {
    console.error("Failed to log admin action:", error);
  }
};

// Utility function to create contact message
exports.createContactMessage = async (messageData) => {
  try {
    await AdminContactMessage.create(messageData);
  } catch (error) {
    console.error("Failed to create contact message:", error);
  }
};

// Get all audit logs (admin only)
exports.getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filters = {};
    if (req.query.action) filters.action = req.query.action;
    if (req.query.adminEmail) filters.adminEmail = req.query.adminEmail;
    if (req.query.targetClientEmail) filters.targetClientEmail = req.query.targetClientEmail;
    if (req.query.status) filters.status = req.query.status;

    const [logs, total] = await Promise.all([
      AdminAuditLog.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminAuditLog.countDocuments(filters),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    res.status(500).json({ error: error.message || "Failed to fetch audit logs." });
  }
};

// Get contact messages for admin
exports.getContactMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filters = {
      dismissed: false,
    };

    if (req.query.type) filters.type = req.query.type;

    const [messages, total] = await Promise.all([
      AdminContactMessage.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminContactMessage.countDocuments(filters),
    ]);

    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Failed to fetch contact messages:", error);
    res.status(500).json({ error: error.message || "Failed to fetch contact messages." });
  }
};

// Mark contact message as read
exports.markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await AdminContactMessage.findByIdAndUpdate(
      messageId,
      { read: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    res.json({ message });
  } catch (error) {
    console.error("Failed to mark message as read:", error);
    res.status(500).json({ error: error.message || "Failed to mark message as read." });
  }
};

// Dismiss contact message
exports.dismissMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await AdminContactMessage.findByIdAndUpdate(
      messageId,
      { dismissed: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    res.json({ message });
  } catch (error) {
    console.error("Failed to dismiss message:", error);
    res.status(500).json({ error: error.message || "Failed to dismiss message." });
  }
};

// Mark all unread messages as read
exports.markAllMessagesAsRead = async (req, res) => {
  try {
    const result = await AdminContactMessage.updateMany(
      { read: false, dismissed: false },
      { read: true }
    );

    res.json({
      message: "All messages marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Failed to mark all messages as read:", error);
    res.status(500).json({ error: error.message || "Failed to mark all messages as read." });
  }
};

// Get unread message count
exports.getUnreadMessageCount = async (req, res) => {
  try {
    const count = await AdminContactMessage.countDocuments({
      read: false,
      dismissed: false,
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error("Failed to get unread message count:", error);
    res.status(500).json({ error: error.message || "Failed to get unread count." });
  }
};

// Get audit log details
exports.getAuditLogDetails = async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await AdminAuditLog.findById(logId)
      .populate("adminId", "name email")
      .populate("targetClientId", "name email")
      .lean();

    if (!log) {
      return res.status(404).json({ error: "Audit log not found." });
    }

    res.json({ log });
  } catch (error) {
    console.error("Failed to fetch audit log details:", error);
    res.status(500).json({ error: error.message || "Failed to fetch audit log details." });
  }
};
