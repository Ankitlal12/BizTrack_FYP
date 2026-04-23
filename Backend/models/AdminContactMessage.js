const mongoose = require("mongoose");

const adminContactMessageSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "subscription_expiring_soon",      // User has X days left
      "subscription_expired",             // User subscription expired
      "subscription_renewed",             // User renewed subscription
      "new_signup",                       // New SaaS client signed up
      "client_frozen",                    // Client account frozen
      "client_deleted",                   // Client account deleted
      "payment_received",                 // Payment received
      "payment_failed",                   // Payment failed
      "system_alert",                     // System alerts
      "high_staff_count",                 // Client has many staff members
      "low_activity",                     // Client has low activity
      "account_reactivated",              // Account reactivated
      "security_alert",                   // Security-related alerts
    ],
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  clientEmail: {
    type: String,
  },
  clientName: {
    type: String,
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
  dismissed: {
    type: Boolean,
    default: false,
  },
  actionUrl: {
    type: String,  // Link to related resource (e.g., /admin/users)
  },
  metadata: {
    subscriptionExpiresAt: Date,
    daysLeft: Number,
    staffCount: Number,
    paymentAmount: Number,
    previousStatus: String,
    currentStatus: String,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
adminContactMessageSchema.index({ read: 1, createdAt: -1 });
adminContactMessageSchema.index({ dismissed: 1, createdAt: -1 });
adminContactMessageSchema.index({ type: 1, createdAt: -1 });
adminContactMessageSchema.index({ clientId: 1, createdAt: -1 });
adminContactMessageSchema.index({ createdAt: -1 });
adminContactMessageSchema.index({ read: 1, dismissed: 1, createdAt: -1 });

module.exports = mongoose.model("AdminContactMessage", adminContactMessageSchema);
