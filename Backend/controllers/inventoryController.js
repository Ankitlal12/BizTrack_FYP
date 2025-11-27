const Inventory = require("../models/Inventory");
const mongoose = require("mongoose");

// Check database connection
const checkDBConnection = () => {
  return mongoose.connection.readyState === 1;
};

// Get all inventory items
exports.getAllInventory = async (req, res) => {
  try {
    // Check if database is connected
    if (!checkDBConnection()) {
      return res.status(503).json({ 
        error: "Database not connected. Please check your MongoDB connection.",
        details: "The server cannot connect to MongoDB. Please verify your .env file and ensure MongoDB is running."
      });
    }

    const items = await Inventory.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error("Error fetching inventory:", err);
    res.status(500).json({ 
      error: "Failed to load inventory items",
      details: err.message 
    });
  }
};

// Get single inventory item
exports.getInventoryById = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new inventory item
exports.createInventory = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update inventory item
exports.updateInventory = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );
    if (!item) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete inventory item
exports.deleteInventory = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    res.json({ message: "Inventory item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

