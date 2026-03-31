// ==================== IMPORTS ====================
const Sale = require("../models/Sale");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const { generateInvoiceFromSale } = require("./invoiceController");
const { getNepaliCurrentDateTime } = require("../utils/dateUtils");
const { createNotification } = require("../utils/notificationHelper");

// ==================== HELPERS ====================

// Check stock level and fire low-stock / out-of-stock notifications
const checkAndCreateStockNotification = async (item) => {
  try {
    if (item.stock <= 0) {
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
          metadata: { itemName: item.name, sku: item.sku, stock: item.stock, reorderLevel: item.reorderLevel },
        });
      }
    } else if (item.stock <= item.reorderLevel) {
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
          metadata: { itemName: item.name, sku: item.sku, stock: item.stock, reorderLevel: item.reorderLevel },
        });
      }
    }
  } catch (notifError) {
    console.error("Failed to create stock notification:", notifError);
  }
};

// Build the payment status notification payload
const buildPaymentNotificationPayload = (sale, amount, paymentDate, isScheduledPayment, method) => {
  let title, message;

  if (isScheduledPayment) {
    title = "Payment Scheduled";
    message = `Payment of Rs ${amount.toFixed(2)} scheduled for ${paymentDate.toDateString()} for sale ${sale.invoiceNumber || sale._id} from ${sale.customerName || sale.customer?.name || 'Customer'}. Payment will be processed automatically on the scheduled date.`;
  } else if (sale.paymentStatus === "paid") {
    title = "Sale Payment Completed";
    message = `Full payment of Rs ${amount.toFixed(2)} received for sale ${sale.invoiceNumber || sale._id} from ${sale.customerName || sale.customer?.name || 'Customer'}. Total amount: Rs ${sale.total.toFixed(2)} - Fully Paid.`;
  } else if (sale.paymentStatus === "partial") {
    const remaining = sale.total - sale.paidAmount;
    title = "Partial Payment Received";
    message = `Partial payment of Rs ${amount.toFixed(2)} received for sale ${sale.invoiceNumber || sale._id} from ${sale.customerName || sale.customer?.name || 'Customer'}. Total: Rs ${sale.total.toFixed(2)}, Paid: Rs ${sale.paidAmount.toFixed(2)}, Remaining: Rs ${remaining.toFixed(2)}.`;
  }

  return { title, message };
};

// ==================== READ ENDPOINTS ====================

// Get all sales with filtering, sorting, and pagination
exports.getAllSales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.search) {
      query.$or = [
        { invoiceNumber: { $regex: req.query.search, $options: 'i' } },
        { customerName: { $regex: req.query.search, $options: 'i' } },
        { 'customer.name': { $regex: req.query.search, $options: 'i' } },
        { 'customer.email': { $regex: req.query.search, $options: 'i' } },
      ];
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.paymentStatus && req.query.paymentStatus !== 'all') {
      query.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.customerName && req.query.customerName !== 'all') {
      query.$or = [
        { customerName: { $regex: req.query.customerName, $options: 'i' } },
        { 'customer.name': { $regex: req.query.customerName, $options: 'i' } },
      ];
    }

    if (req.query.dateFrom || req.query.dateTo) {
      query.createdAt = {};
      if (req.query.dateFrom) query.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) query.createdAt.$lte = new Date(req.query.dateTo);
    }

    if (req.query.totalMin || req.query.totalMax) {
      query.total = {};
      if (req.query.totalMin) query.total.$gte = parseFloat(req.query.totalMin);
      if (req.query.totalMax) query.total.$lte = parseFloat(req.query.totalMax);
    }

    const fieldMap = { date: 'createdAt', total: 'total', customerName: 'customerName', invoiceNumber: 'invoiceNumber' };
    let sortObj = { createdAt: -1 };
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      sortObj = { [fieldMap[req.query.sortBy] || 'createdAt']: sortOrder };
    }

    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query).populate("items.inventoryId").sort(sortObj).skip(skip).limit(limit);

    res.json({
      sales,
      pagination: { current: page, pages: Math.ceil(total / limit), total, limit },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single sale by ID
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate("items.inventoryId");
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== WRITE ENDPOINTS ====================

// Create new sale — validates stock, deducts inventory, generates invoice & notification
exports.createSale = async (req, res) => {
  try {
    if (!req.body.invoiceNumber) {
      const count = await Sale.countDocuments();
      req.body.invoiceNumber = `SALE-${String(count + 1).padStart(6, '0')}`;
    }

    // Validate stock availability
    const stockErrors = [];
    for (const item of req.body.items) {
      if (item.inventoryId) {
        const inventoryItem = await Inventory.findById(item.inventoryId);
        if (!inventoryItem) {
          stockErrors.push(`Item ${item.name || item.inventoryId} not found in inventory`);
        } else if (inventoryItem.stock < item.quantity) {
          stockErrors.push(`Insufficient stock for ${item.name || inventoryItem.name}. Available: ${inventoryItem.stock}, Requested: ${item.quantity}`);
        }
      }
    }
    if (stockErrors.length > 0) {
      return res.status(400).json({ error: "Insufficient stock", details: stockErrors });
    }

    // Deduct inventory stock and check for low-stock notifications
    for (const item of req.body.items) {
      if (item.inventoryId) {
        const updatedInventory = await Inventory.findByIdAndUpdate(
          item.inventoryId,
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        if (updatedInventory) await checkAndCreateStockNotification(updatedInventory);
      }
    }

    const sale = await Sale.create(req.body);

    // Auto-generate invoice
    try {
      await generateInvoiceFromSale(sale, {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || "Unknown User",
        role: req.user?.role || "staff",
      });
    } catch (invoiceError) {
      console.error("Failed to generate invoice for sale:", invoiceError);
    }

    // Create sale notification
    try {
      const totalItems = req.body.items.reduce((sum, item) => sum + item.quantity, 0);
      await createNotification({
        type: "sale",
        title: "New Sale Created",
        message: `Sale ${sale.invoiceNumber || sale._id} has been created with ${totalItems} item(s) for ${req.body.customerName || 'customer'}.`,
        relatedId: sale._id,
        relatedModel: "Sale",
        metadata: { invoiceNumber: sale.invoiceNumber, customerName: req.body.customerName, totalItems, total: sale.total },
      });
    } catch (notifError) {
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
    const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("items.inventoryId");
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    res.json(sale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete sale — restores inventory stock
exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    for (const item of sale.items) {
      if (item.inventoryId) {
        await Inventory.findByIdAndUpdate(item.inventoryId, { $inc: { stock: item.quantity } });
      }
    }

    await Sale.findByIdAndDelete(req.params.id);
    res.json({ message: "Sale deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== PAYMENT ENDPOINTS ====================

// Record a payment for a sale (immediate or scheduled)
exports.recordPayment = async (req, res) => {
  try {
    const { amount, date, method, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Payment amount must be greater than 0" });
    }

    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const currentPaidAmount = sale.paidAmount || 0;
    const currentScheduledAmount = sale.scheduledAmount || 0;
    const remainingBalance = sale.total - currentPaidAmount - currentScheduledAmount;

    if (amount > remainingBalance) {
      return res.status(400).json({
        error: `Payment amount (Rs ${amount.toFixed(2)}) cannot exceed remaining balance (Rs ${remainingBalance.toFixed(2)})`,
      });
    }

    const paymentDate = date ? new Date(date) : new Date();
    const isScheduledPayment = paymentDate > new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
    const oldPaymentStatus = sale.paymentStatus;

    sale.payments = sale.payments || [];
    sale.payments.push({
      amount,
      date: paymentDate,
      method: method || "cash",
      notes: notes || "",
      status: isScheduledPayment ? "scheduled" : "completed",
    });

    if (isScheduledPayment) {
      sale.scheduledAmount = currentScheduledAmount + amount;
    } else {
      const newPaidAmount = currentPaidAmount + amount;
      sale.paidAmount = newPaidAmount;
      if (newPaidAmount >= sale.total) sale.paymentStatus = "paid";
      else if (newPaidAmount > 0) sale.paymentStatus = "partial";
      else sale.paymentStatus = "unpaid";
    }

    await sale.save();

    // Sync invoice for immediate payments
    if (!isScheduledPayment) {
      try {
        const Invoice = require('../models/Invoice');
        const invoice = await Invoice.findOne({ relatedId: sale._id, type: 'sale' });
        if (invoice) {
          invoice.paymentStatus = sale.paymentStatus;
          invoice.paidAmount = sale.paidAmount;
          if (method) invoice.paymentMethod = method;
          invoice.status = sale.paymentStatus === "paid" ? "paid" : "sent";
          await invoice.save();
        }
      } catch (syncError) {
        console.error('⚠️ Failed to sync payment to invoice:', syncError);
      }
    }

    // Create payment notification
    try {
      const { title, message } = buildPaymentNotificationPayload(sale, amount, paymentDate, isScheduledPayment, method);
      await createNotification({
        type: isScheduledPayment ? "payment_scheduled" : "payment_received",
        title,
        message,
        relatedId: sale._id,
        relatedModel: "Sale",
        metadata: {
          invoiceNumber: sale.invoiceNumber,
          customerName: sale.customerName || sale.customer?.name || 'Customer',
          paymentAmount: amount,
          totalAmount: sale.total,
          paidAmount: sale.paidAmount || 0,
          scheduledAmount: sale.scheduledAmount || 0,
          remainingAmount: sale.total - (sale.paidAmount || 0) - (sale.scheduledAmount || 0),
          paymentStatus: sale.paymentStatus,
          previousPaymentStatus: oldPaymentStatus,
          paymentMethod: method || "cash",
          isScheduled: isScheduledPayment,
          scheduledDate: isScheduledPayment ? paymentDate : null,
        },
      });
    } catch (notifError) {
      console.error("Failed to create payment notification:", notifError);
    }

    const populatedSale = await Sale.findById(sale._id).populate("items.inventoryId");
    res.json(populatedSale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
