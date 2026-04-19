const mongoose = require("mongoose");

const saasSignupSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    googleId: {
      type: String,
      required: true,
      index: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
    },
    phone: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "NPR",
    },
    pidx: {
      type: String,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["initiated", "completed", "failed"],
      default: "initiated",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SaasSignup", saasSignupSchema);
