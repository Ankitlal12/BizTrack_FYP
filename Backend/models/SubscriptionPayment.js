const mongoose = require("mongoose");

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    businessName: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "NPR",
    },
    paymentMethod: {
      type: String,
      enum: ["khalti", "manual", "other"],
      default: "khalti",
    },
    pidx: {
      type: String,
      index: true,
      unique: true, // Prevent duplicate payments
      sparse: true, // Allow null values
    },
    paymentStatus: {
      type: String,
      enum: ["initiated", "completed", "failed"],
      default: "initiated",
    },
    paymentType: {
      type: String,
      enum: ["initial", "renewal"],
      required: true,
    },
    subscriptionStartDate: {
      type: Date,
      required: true,
    },
    subscriptionEndDate: {
      type: Date,
      required: true,
    },
    daysGranted: {
      type: Number,
      default: 10,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Index for querying payment history
subscriptionPaymentSchema.index({ ownerId: 1, createdAt: -1 });
subscriptionPaymentSchema.index({ subscriptionEndDate: 1 });

module.exports = mongoose.model("SubscriptionPayment", subscriptionPaymentSchema);
