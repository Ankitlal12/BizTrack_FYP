const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: function() {
      return !this.googleId; // Required only if not a Google user
    },
    unique: true,
    sparse: true, // Allows multiple null values
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Required only if not a Google user
    },
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
  },
  avatar: {
    type: String,
  },
  role: {
    type: String,
    enum: ['owner', 'manager', 'staff'],
    default: 'staff',
  },
  active: {
    type: Boolean,
    default: true,
  },
  dateAdded: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("User", userSchema);
