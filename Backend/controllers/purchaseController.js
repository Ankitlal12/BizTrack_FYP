const Purchase = require("../models/Purchase");
const Inventory = require("../models/Inventory");

// Get all purchases
exports.getAllPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate("items.inventoryId")
      .sort({ createdAt: -1 });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single purchase
exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate("items.inventoryId");
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new purchase
exports.createPurchase = async (req, res) => {
  try {
    // Process items and create/update inventory
    const processedItems = [];
    
    for (const item of req.body.items) {
      let inventoryItem;
      
      // Check if item already exists in inventory by name
      inventoryItem = await Inventory.findOne({ name: item.name });
      
      if (inventoryItem) {
        // Item exists, update stock and cost/price if needed
        inventoryItem.stock += item.quantity;
        if (item.cost && item.cost > 0) {
          inventoryItem.cost = item.cost;
        }
        if (item.sellingPrice && item.sellingPrice > 0) {
          inventoryItem.price = item.sellingPrice;
        }
        await inventoryItem.save();
      } else {
        // Create new inventory item
        // Generate SKU from item name
        const sku = item.name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 8) + '-' + Date.now().toString().slice(-6);
        
        inventoryItem = await Inventory.create({
          name: item.name,
          sku: sku,
          category: item.category || 'Other',
          price: item.sellingPrice || item.cost || 0,
          cost: item.cost || 0,
          stock: item.quantity,
          reorderLevel: 5,
          supplier: req.body.supplierName || 'Unknown',
          location: 'Warehouse',
        });
      }
      
      // Add inventoryId to the item
      processedItems.push({
        ...item,
        inventoryId: inventoryItem._id,
      });
    }
    
    // Create purchase with processed items
    const purchaseData = {
      ...req.body,
      items: processedItems,
    };
    
    const purchase = await Purchase.create(purchaseData);

    const populatedPurchase = await Purchase.findById(purchase._id).populate("items.inventoryId");
    res.status(201).json(populatedPurchase);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update purchase
exports.updatePurchase = async (req, res) => {
  try {
    const oldPurchase = await Purchase.findById(req.params.id);
    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("items.inventoryId");

    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Update inventory if status changed to received
    if (req.body.status === "received" && oldPurchase.status !== "received") {
      for (const item of purchase.items) {
        if (item.inventoryId) {
          await Inventory.findByIdAndUpdate(item.inventoryId, {
            $inc: { stock: item.quantity },
          });
        }
      }
    }

    res.json(purchase);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete purchase
exports.deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Restore inventory stock if purchase was received
    if (purchase.status === "received") {
      for (const item of purchase.items) {
        if (item.inventoryId) {
          await Inventory.findByIdAndUpdate(item.inventoryId, {
            $inc: { stock: -item.quantity },
          });
        }
      }
    }

    await Purchase.findByIdAndDelete(req.params.id);
    res.json({ message: "Purchase deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

