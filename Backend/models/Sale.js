const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerEmail: {
    type: String,
  },
  customerPhone: {
    type: String,
  },
  items: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
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
  discount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "bank_transfer", "other"],
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
      enum: ["cash", "card", "bank_transfer", "other"],
      required: true,
    },
    notes: {
      type: String,
    },
  }],
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "completed",
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

// Generate invoice number automatically for sales
saleSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    try {
      const count = await this.constructor.countDocuments();
      this.invoiceNumber = `SALE-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating sale invoice number:', error);
      // Fallback to timestamp-based number if count fails
      const timestamp = Date.now().toString().slice(-6);
      this.invoiceNumber = `SALE-${timestamp}`;
    }
  }
  next();
});

module.exports = mongoose.model("Sale", saleSchema);

