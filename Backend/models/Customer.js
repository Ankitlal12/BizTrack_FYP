const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  tenantKey: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^(97|98)\d{8}$/, "Phone must be exactly 10 digits and start with 97 or 98"],
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
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
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Index for faster search
customerSchema.index({ name: 1, phone: 1 });
customerSchema.index({ isActive: 1 });

module.exports = mongoose.model("Customer", customerSchema);



