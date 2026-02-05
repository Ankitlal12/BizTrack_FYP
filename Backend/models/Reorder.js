const mongoose = require("mongoose");

const reorderSchema = new mongoose.Schema({
  reorderNumber: {
    type: String,
    unique: true,
  },
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    required: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
  },
  triggerType: {
    type: String,
    enum: ['auto', 'manual', 'out_of_stock'],
    required: true,
  },
  triggeredAt: {
    type: Date,
    default: Date.now,
  },
  triggeredBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
    },
    role: {
      type: String,
    },
  },
  stockAtTrigger: {
    type: Number,
    required: true,
  },
  reorderLevel: {
    type: Number,
    required: true,
  },
  suggestedQuantity: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'ordered', 'received', 'cancelled'],
    default: 'pending',
  },
  purchaseOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Purchase",
  },
  orderedQuantity: {
    type: Number,
  },
  receivedQuantity: {
    type: Number,
  },
  resolvedAt: {
    type: Date,
  },
  resolvedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
    },
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
reorderSchema.index({ inventoryId: 1 });
reorderSchema.index({ supplierId: 1 });
reorderSchema.index({ status: 1 });
reorderSchema.index({ triggerType: 1 });
reorderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Reorder", reorderSchema);