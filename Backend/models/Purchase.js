const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  tenantKey: {
    type: String,
    required: true,
    index: true,
  },
  purchaseNumber: {
    type: String,
    required: true,
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
    category: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
    },
    cost: {
      type: Number,
      required: true,
    },
    sellingPrice: {
      type: Number,
    },
    total: {
      type: Number,
      required: true,
    },
    expiryDate: {
      type: Date,
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
    enum: ["cash", "card", "bank_transfer", "credit", "khalti", "other"],
    default: "cash",
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "partial", "paid", "scheduled"],
    default: "unpaid",
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  scheduledAmount: {
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
      enum: ["cash", "card", "bank_transfer", "credit", "khalti", "other"],
      required: true,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ["completed", "scheduled"],
      default: "completed",
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
  // Khalti payment info
  khaltiPayment: {
    pidx: String,
    transactionId: String,
    status: String,
  },
}, {
  timestamps: true,
});

// Purchase numbers are tenant-scoped in SaaS mode.
purchaseSchema.index({ tenantKey: 1, purchaseNumber: 1 }, { unique: true });

// Generate purchase number automatically
purchaseSchema.pre('save', async function(next) {
  if (this.isNew && !this.purchaseNumber) {
    try {
      const scopeQuery = this.tenantKey ? { tenantKey: this.tenantKey } : {};
      const count = await this.constructor.countDocuments(scopeQuery);
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

purchaseSchema.statics.ensureTenantScopedPurchaseNumberIndex = async function() {
  try {
    const indexes = await this.collection.indexes();
    const hasLegacyGlobal = indexes.some((idx) => idx.name === 'purchaseNumber_1' && idx.unique);

    if (hasLegacyGlobal) {
      await this.collection.dropIndex('purchaseNumber_1');
      console.log('Dropped legacy global unique index purchaseNumber_1 on purchases');
    }

    await this.collection.createIndex(
      { tenantKey: 1, purchaseNumber: 1 },
      { unique: true, name: 'tenantKey_1_purchaseNumber_1' }
    );
  } catch (error) {
    console.error('Failed to ensure tenant-scoped purchase number index:', error.message);
  }
};

module.exports = mongoose.model("Purchase", purchaseSchema);

