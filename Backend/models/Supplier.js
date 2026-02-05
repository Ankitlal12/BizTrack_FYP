const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
  },
  address: {
    street: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    zipCode: {
      type: String,
    },
    country: {
      type: String,
      default: 'Nepal',
    },
  },
  contactPerson: {
    type: String,
  },
  paymentTerms: {
    type: String,
    enum: ['immediate', 'net15', 'net30', 'net45', 'net60'],
    default: 'net30',
  },
  averageLeadTimeDays: {
    type: Number,
    default: 7,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
  },
  products: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
    },
    supplierProductCode: {
      type: String,
    },
    lastPurchasePrice: {
      type: Number,
    },
    minimumOrderQuantity: {
      type: Number,
      default: 1,
    },
  }],
}, {
  timestamps: true,
});

// Index for efficient queries
supplierSchema.index({ name: 1 });
supplierSchema.index({ isActive: 1 });
supplierSchema.index({ "products.inventoryId": 1 });

module.exports = mongoose.model("Supplier", supplierSchema);