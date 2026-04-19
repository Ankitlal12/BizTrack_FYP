const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: function() {
      return !this.googleId; // Required only if not a Google user
    },
    unique: true,
    sparse: true, // Allows multiple null values
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Required only if not a Google user
    },
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
  },
  avatar: {
    type: String,
  },
  role: {
    type: String,
    enum: ['admin', 'owner', 'manager', 'staff'],
    default: 'staff',
  },
  tenantKey: {
    type: String,
    trim: true,
    index: true,
  },
  workspaceHost: {
    type: String,
    trim: true,
    lowercase: true,
  },
  isSaasCustomer: {
    type: Boolean,
    default: false,
  },
  accountStatus: {
    type: String,
    enum: ["active", "frozen", "deleted"],
    default: "active",
  },
  subscriptionPlan: {
    type: String,
    enum: ["monthly"],
    default: "monthly",
  },
  subscriptionLastPaidAt: {
    type: Date,
  },
  subscriptionExpiresAt: {
    type: Date,
  },
  active: {
    type: Boolean,
    default: true,
  },
  dateAdded: {
    type: Date,
    default: Date.now,
  },
  // OTP fields for two-factor authentication
  otp: {
    code: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  // Track if user has enabled 2FA
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("User", userSchema);
