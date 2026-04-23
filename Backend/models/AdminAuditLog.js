const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  adminEmail: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      "freeze_client",
      "unfreeze_client",
      "delete_client",
      "edit_client",
      "update_client_username",
      "toggle_client_active",
      "view_client",
      "login_view",
    ],
  },
  targetClientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  targetClientEmail: {
    type: String,
  },
  targetClientName: {
    type: String,
  },
  details: {
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changes: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  status: {
    type: String,
    enum: ["success", "failed"],
    default: "success",
  },
  errorMessage: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetClientId: 1, createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });
adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ targetClientEmail: 1, createdAt: -1 });
adminAuditLogSchema.index({ adminEmail: 1, createdAt: -1 });

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);
