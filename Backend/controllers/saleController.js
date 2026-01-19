const Sale = require("../models/Sale");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");

// Helper function to check and create low stock notifications
const checkAndCreateStockNotification = async (item) => {
  try {
    // Check if stock is out
    if (item.stock <= 0) {
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
    console.error("Failed to create stock notification:", notifError);
  }
};

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

    // Update inventory stock for each item and check for low stock notifications
    for (const item of req.body.items) {
      if (item.inventoryId) {
        const updatedInventory = await Inventory.findByIdAndUpdate(
          item.inventoryId,
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        
        // Check for low stock after sale
        if (updatedInventory) {
          await checkAndCreateStockNotification(updatedInventory);
        }
      }
    }

    const sale = await Sale.create(req.body);

    // Create notification for new sale
    try {
      const totalItems = req.body.items.reduce((sum, item) => sum + item.quantity, 0);
      await Notification.create({
        type: "sale",
        title: "New Sale Created",
        message: `Sale ${sale.invoiceNumber || sale._id} has been created with ${totalItems} item(s) for ${req.body.customerName || 'customer'}.`,
        relatedId: sale._id,
        relatedModel: "Sale",
        metadata: {
          invoiceNumber: sale.invoiceNumber,
          customerName: req.body.customerName,
          totalItems: totalItems,
          total: sale.total,
        },
      });
    } catch (notifError) {
      // Don't fail the sale creation if notification fails
      console.error("Failed to create notification:", notifError);
    }

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

// Record payment for a sale
exports.recordPayment = async (req, res) => {
  try {
    const { amount, date, method, notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Payment amount must be greater than 0" });
    }

    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const currentPaidAmount = sale.paidAmount || 0;
    const remainingBalance = sale.total - currentPaidAmount;

    if (amount > remainingBalance) {
      return res.status(400).json({ 
        error: `Payment amount (Rs ${amount.toFixed(2)}) cannot exceed remaining balance (Rs ${remainingBalance.toFixed(2)})` 
      });
    }

    const newPaidAmount = currentPaidAmount + amount;
    const oldPaymentStatus = sale.paymentStatus;
    
    // Determine new payment status
    let newPaymentStatus;
    if (newPaidAmount >= sale.total) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "unpaid";
    }

    // Add payment to payments array
    const paymentRecord = {
      amount,
      date: date ? new Date(date) : new Date(),
      method: method || "cash",
      notes: notes || "",
    };

    sale.payments = sale.payments || [];
    sale.payments.push(paymentRecord);
    sale.paidAmount = newPaidAmount;
    sale.paymentStatus = newPaymentStatus;

    await sale.save();

    // Create notification for payment received from customer
    try {
      let notificationTitle, notificationMessage;
      
      if (newPaymentStatus === "paid") {
        notificationTitle = "Sale Payment Completed";
        notificationMessage = `Full payment of Rs ${amount.toFixed(2)} received for sale ${sale.invoiceNumber || sale._id} from ${sale.customerName}. Total amount: Rs ${sale.total.toFixed(2)} - Fully Paid.`;
      } else if (newPaymentStatus === "partial") {
        const remaining = sale.total - newPaidAmount;
        notificationTitle = "Partial Payment Received";
        notificationMessage = `Partial payment of Rs ${amount.toFixed(2)} received for sale ${sale.invoiceNumber || sale._id} from ${sale.customerName}. Total: Rs ${sale.total.toFixed(2)}, Paid: Rs ${newPaidAmount.toFixed(2)}, Remaining: Rs ${remaining.toFixed(2)}.`;
      }

      await Notification.create({
        type: "payment_received",
        title: notificationTitle,
        message: notificationMessage,
        relatedId: sale._id,
        relatedModel: "Sale",
        metadata: {
          invoiceNumber: sale.invoiceNumber,
          customerName: sale.customerName,
          paymentAmount: amount,
          totalAmount: sale.total,
          paidAmount: newPaidAmount,
          remainingAmount: sale.total - newPaidAmount,
          paymentStatus: newPaymentStatus,
          previousPaymentStatus: oldPaymentStatus,
          paymentMethod: method || "cash",
        },
      });
    } catch (notifError) {
      // Don't fail the payment recording if notification fails
      console.error("Failed to create payment notification:", notifError);
    }

    const populatedSale = await Sale.findById(sale._id).populate("items.inventoryId");
    res.json(populatedSale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};