const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  purchaseNumber: {
    type: String,
    required: true,
    unique: true,
  },
  supplierName: {
    type: String,
    required: true,
  },
  supplierEmail: {
    type: String,
  },
  supplierPhone: {
    type: String,
  },
  items: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    cost: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
  }],
  subtotal: {
    type: Number,
    required: true,
  },
  tax: {
    type: Number,
    default: 0,
  },
  shipping: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "bank_transfer", "credit", "other"],
    default: "cash",
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "partial", "paid"],
    default: "unpaid",
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  payments: [{
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "credit", "other"],
      required: true,
    },
    notes: {
      type: String,
    },
  }],
  status: {
    type: String,
    enum: ["pending", "received", "cancelled"],
    default: "pending",
  },
  expectedDeliveryDate: {
    type: Date,
  },
  notes: {
    type: String,
  },
  // User tracking fields
  createdBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: String,
    role: {
      type: String,
      enum: ["owner", "manager", "staff"],
    },
  },
}, {
  timestamps: true,
});

// Generate purchase number automatically
purchaseSchema.pre('save', async function(next) {
  if (this.isNew && !this.purchaseNumber) {
    try {
      const count = await this.constructor.countDocuments();
      this.purchaseNumber = `PO-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating purchase number:', error);
      // Fallback to timestamp-based number if count fails
      const timestamp = Date.now().toString().slice(-6);
      this.purchaseNumber = `PO-${timestamp}`;
    }
  }
  next();
});

module.exports = mongoose.model("Purchase", purchaseSchema);

