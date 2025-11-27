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
    const purchase = await Purchase.create(req.body);

    // Update inventory stock when purchase is received
    if (req.body.status === "received") {
      for (const item of req.body.items) {
        if (item.inventoryId) {
          await Inventory.findByIdAndUpdate(item.inventoryId, {
            $inc: { stock: item.quantity },
          });
        }
      }
    }

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

