const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
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

// Helper function to check and create low stock notifications
const checkAndCreateStockNotification = async (item) => {
  try {
    // Check if stock is out
    if (item.stock <= 0) {
      // Check if notification already exists for this item (to avoid duplicates)
      const existingNotif = await Notification.findOne({
        type: "out_of_stock",
        relatedId: item._id,
        read: false,
      });
      
      if (!existingNotif) {
        await Notification.create({
          type: "out_of_stock",
          title: "Item Out of Stock",
          message: `${item.name} (SKU: ${item.sku}) is out of stock. Please restock immediately.`,
          relatedId: item._id,
          relatedModel: "Inventory",
          metadata: {
            itemName: item.name,
            sku: item.sku,
            stock: item.stock,
            reorderLevel: item.reorderLevel,
          },
        });
      }
    }
    // Check if stock is low (below reorder level)
    else if (item.stock <= item.reorderLevel) {
      // Check if notification already exists for this item
      const existingNotif = await Notification.findOne({
        type: "low_stock",
        relatedId: item._id,
        read: false,
      });
      
      if (!existingNotif) {
        await Notification.create({
          type: "low_stock",
          title: "Low Stock Alert",
          message: `${item.name} (SKU: ${item.sku}) is running low. Current stock: ${item.stock}, Reorder level: ${item.reorderLevel}.`,
          relatedId: item._id,
          relatedModel: "Inventory",
          metadata: {
            itemName: item.name,
            sku: item.sku,
            stock: item.stock,
            reorderLevel: item.reorderLevel,
          },
        });
      }
    }
  } catch (notifError) {
    // Don't fail the operation if notification fails
    console.error("Failed to create stock notification:", notifError);
  }
};

// Create new inventory item
exports.createInventory = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    
    // Check for low stock and create notification
    await checkAndCreateStockNotification(item);
    
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
    
    // Check for low stock and create notification if stock changed
    if (req.body.stock !== undefined) {
      await checkAndCreateStockNotification(item);
    }
    
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Check all inventory for low stock (can be called periodically)
exports.checkLowStock = async (req, res) => {
  try {
    const items = await Inventory.find();
    let notificationsCreated = 0;
    
    for (const item of items) {
      await checkAndCreateStockNotification(item);
      notificationsCreated++;
    }
    
    res.json({ 
      message: "Low stock check completed",
      itemsChecked: items.length 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

