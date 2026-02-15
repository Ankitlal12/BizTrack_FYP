const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  cost: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
  reorderLevel: {
    type: Number,
    required: true,
    default: 15,
  },
  reorderQuantity: {
    type: Number,
    default: 10,
  },
  maximumStock: {
    type: Number,
    default: 100,
  },
  preferredSupplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
  },
  supplierProductCode: {
    type: String,
  },
  lastPurchasePrice: {
    type: Number,
    default: 0,
  },
  reorderStatus: {
    type: String,
    enum: ['none', 'needed', 'pending', 'ordered'],
    default: 'none',
  },
  pendingOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Purchase",
  },
  lastReorderDate: {
    type: Date,
  },
  averageDailySales: {
    type: Number,
    default: 0,
  },
  leadTimeDays: {
    type: Number,
    default: 7,
  },
  safetyStock: {
    type: Number,
    default: 5,
  },
  autoReorderEnabled: {
    type: Boolean,
    default: false,
  },
  supplier: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  expiryDate: {
    type: Date,
  },
  categoryType: {
    type: String,
    enum: ['food', 'non-food'],
    default: 'non-food',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Inventory", inventorySchema);

