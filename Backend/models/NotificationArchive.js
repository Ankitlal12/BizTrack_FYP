const mongoose = require("mongoose");

const notificationArchiveSchema = new mongoose.Schema({
  tenantKey: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "purchase", 
      "sale", 
      "low_stock", 
      "out_of_stock", 
      "system", 
      "payment_received", 
      "payment_made",
      "payment_scheduled",
      "reorder_needed", 
      "reorder_created", 
      "reorder_approved", 
      "auto_reorder", 
      "low_stock_purchase",
      "login_failed",
      "login_success",
      "security_change",
      "expiring_soon",
      "expired",
      "installment_due",
      "scheduled_payment_processed",
      "delivery_received",
      "subscription_expiring_soon",
      "subscription_expired",
      "subscription_renewed",
    ],
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "relatedModel",
  },
  relatedModel: {
    type: String,
    enum: ["Purchase", "Sale", "Inventory", "User", "Reorder", "Supplier", null],
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Track if this was dismissed from layout bar (but still exists in archive)
  dismissedFromLayoutBar: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
notificationArchiveSchema.index({ tenantKey: 1, read: 1, createdAt: -1 });
notificationArchiveSchema.index({ read: 1, createdAt: -1 });
notificationArchiveSchema.index({ createdAt: -1 });
notificationArchiveSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("NotificationArchive", notificationArchiveSchema);
