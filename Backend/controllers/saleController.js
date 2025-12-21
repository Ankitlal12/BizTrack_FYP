const Sale = require("../models/Sale");
const Inventory = require("../models/Inventory");

// Get all sales
exports.getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("items.inventoryId")
      .sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single sale
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate("items.inventoryId");
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new sale
exports.createSale = async (req, res) => {
  try {
    // Validate stock availability before creating sale
    const stockErrors = [];
    for (const item of req.body.items) {
      if (item.inventoryId) {
        const inventoryItem = await Inventory.findById(item.inventoryId);
        if (!inventoryItem) {
          stockErrors.push(`Item ${item.name || item.inventoryId} not found in inventory`);
        } else if (inventoryItem.stock < item.quantity) {
          stockErrors.push(
            `Insufficient stock for ${item.name || inventoryItem.name}. Available: ${inventoryItem.stock}, Requested: ${item.quantity}`
          );
        }
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({ 
        error: "Insufficient stock", 
        details: stockErrors 
      });
    }

    // Update inventory stock for each item
    for (const item of req.body.items) {
      if (item.inventoryId) {
        await Inventory.findByIdAndUpdate(item.inventoryId, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    const sale = await Sale.create(req.body);
    const populatedSale = await Sale.findById(sale._id).populate("items.inventoryId");
    res.status(201).json(populatedSale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update sale
exports.updateSale = async (req, res) => {
  try {
    const sale = await Sale.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("items.inventoryId");
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }
    res.json(sale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete sale
exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // Restore inventory stock
    for (const item of sale.items) {
      if (item.inventoryId) {
        await Inventory.findByIdAndUpdate(item.inventoryId, {
          $inc: { stock: item.quantity },
        });
      }
    }

    await Sale.findByIdAndDelete(req.params.id);
    res.json({ message: "Sale deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

