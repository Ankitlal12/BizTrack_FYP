const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["purchase", "sale", "low_stock", "out_of_stock", "system", "payment_received", "payment_made", "reorder_needed", "reorder_created", "reorder_approved", "auto_reorder", "low_stock_purchase", "login_failed", "login_success", "security_change", "expiring_soon", "expired"],
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
}, {
  timestamps: true,
});

// Index for efficient querying
notificationSchema.index({ read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);


