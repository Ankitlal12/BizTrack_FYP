const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
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
  normalizedName: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
});

categorySchema.index({ tenantKey: 1, normalizedName: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);