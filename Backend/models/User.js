const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: function() {
      // Email required for admin and owner, optional for staff/manager
      return this.role === 'admin' || this.role === 'owner';
    },
    unique: true,
    sparse: true,
  },
  phoneNumber: {
    type: String,
    required: function() {
      // Phone required for staff/manager (unless Google user), optional for admin/owner
      return !this.googleId && (this.role === 'staff' || this.role === 'manager');
    },
    unique: true,
    sparse: true,
    trim: true,
    validate: {
      validator: function(v) {
        // If phone number is provided, it must be valid format
        if (!v) return true; // Allow empty for admin/owner
        return /^(97|98)\d{8}$/.test(v);
      },
      message: 'Phone number must be 10 digits starting with 97 or 98'
    }
  },
  username: {
    type: String,
    required: false, // Username is now optional
    // No field-level index here — uniqueness enforced by compound index { tenantKey, username }
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
  credentialsInitialized: {
    type: Boolean,
    default: false,
    description: "Whether owner has initialized/enabled credentials for this staff member"
  },
  credentialsInitializedAt: {
    type: Date,
    description: "When the owner initialized credentials"
  },
  credentialsInitializedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    description: "Owner who initialized the credentials"
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

// Compound unique index: username is unique per tenant, allowing same username across different tenants
userSchema.index({ tenantKey: 1, username: 1 }, { unique: true, sparse: true });

// Automatically fix indexes on schema creation
userSchema.pre('init', function() {
  // This hook will help ensure indexes are properly created
});

module.exports = mongoose.model("User", userSchema);
