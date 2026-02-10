const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const { createNotification } = require("../utils/notificationHelper");

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

    const items = await Inventory.find().sort({ createdAt: 1 });
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
      // Update reorder status
      item.reorderStatus = 'needed';
      await item.save();

      // Check if notification already exists for this item (to avoid duplicates)
      const existingNotif = await Notification.findOne({
        type: "out_of_stock",
        relatedId: item._id,
        read: false,
      });
      
      if (!existingNotif) {
        await createNotification({
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
            inventoryId: item._id,
          },
        });
      }
    }
    // Check if stock is low (below reorder level)
    else if (item.stock <= item.reorderLevel) {
      // Update reorder status
      item.reorderStatus = 'needed';
      await item.save();

      // Check if notification already exists for this item
      const existingNotif = await Notification.findOne({
        type: "low_stock",
        relatedId: item._id,
        read: false,
      });
      
      if (!existingNotif) {
        await createNotification({
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
            inventoryId: item._id,
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


// Get low stock items
exports.getLowStockItems = async (req, res) => {
  try {
    const { category, supplier } = req.query;
    
    // Build query for low stock items
    const query = {
      $or: [
        { stock: { $lte: 0 } }, // Out of stock
        { $expr: { $lte: ['$stock', '$reorderLevel'] } } // Below reorder level
      ]
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (supplier && supplier !== 'all') {
      query.supplier = { $regex: supplier, $options: 'i' };
    }

    const items = await Inventory.find(query)
      .populate('preferredSupplierId', 'name contactPerson phone email')
      .sort({ stock: 1 }); // Most critical first

    res.json({ data: items });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ 
      error: 'Failed to fetch low stock items',
      details: error.message 
    });
  }
};

// Update reorder settings for an inventory item
exports.updateReorderSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reorderLevel,
      reorderQuantity,
      maximumStock,
      preferredSupplierId,
      leadTimeDays,
      safetyStock,
      autoReorderEnabled
    } = req.body;

    const updateData = {};
    
    if (reorderLevel !== undefined) updateData.reorderLevel = reorderLevel;
    if (reorderQuantity !== undefined) updateData.reorderQuantity = reorderQuantity;
    if (maximumStock !== undefined) updateData.maximumStock = maximumStock;
    if (preferredSupplierId !== undefined) updateData.preferredSupplierId = preferredSupplierId;
    if (leadTimeDays !== undefined) updateData.leadTimeDays = leadTimeDays;
    if (safetyStock !== undefined) updateData.safetyStock = safetyStock;
    if (autoReorderEnabled !== undefined) updateData.autoReorderEnabled = autoReorderEnabled;

    const item = await Inventory.findByIdAndUpdate(
      id,
      { ...updateData, lastUpdated: new Date() },
      { new: true, runValidators: true }
    ).populate('preferredSupplierId', 'name contactPerson');

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ 
      data: item,
      message: 'Reorder settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating reorder settings:', error);
    res.status(500).json({ 
      error: 'Failed to update reorder settings',
      details: error.message 
    });
  }
};