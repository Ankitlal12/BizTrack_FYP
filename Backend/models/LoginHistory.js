const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userRole: {
    type: String,
    enum: ["owner", "manager", "staff"],
    required: true,
  },
  loginTime: {
    type: Date,
    default: Date.now,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  loginMethod: {
    type: String,
    enum: ["credentials", "google"],
    default: "credentials",
  },
  success: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
loginHistorySchema.index({ loginTime: -1 });
loginHistorySchema.index({ userId: 1, loginTime: -1 });

module.exports = mongoose.model("LoginHistory", loginHistorySchema);