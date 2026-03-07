const Sale = require("../models/Sale");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const { generateInvoiceFromSale } = require("./invoiceController");
const { getNepaliCurrentDateTime } = require("../utils/dateUtils");
const { createNotification } = require("../utils/notificationHelper");

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query object for filtering
    const query = {};
    
    // Add filters if provided
    if (req.query.search) {
      query.$or = [
        { invoiceNumber: { $regex: req.query.search, $options: 'i' } },
        { customerName: { $regex: req.query.search, $options: 'i' } },
        { 'customer.name': { $regex: req.query.search, $options: 'i' } },
        { 'customer.email': { $regex: req.query.search, $options: 'i' } }
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
        { 'customer.name': { $regex: req.query.customerName, $options: 'i' } }
      ];
    }
    
    // Date range filtering
    if (req.query.dateFrom || req.query.dateTo) {
      query.createdAt = {};
      if (req.query.dateFrom) {
        query.createdAt.$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        query.createdAt.$lte = new Date(req.query.dateTo);
      }
    }
    
    // Amount range filtering
    if (req.query.totalMin || req.query.totalMax) {
      query.total = {};
      if (req.query.totalMin) {
        query.total.$gte = parseFloat(req.query.totalMin);
      }
      if (req.query.totalMax) {
        query.total.$lte = parseFloat(req.query.totalMax);
      }
    }

    // Build sort object
    let sortObj = { createdAt: -1 }; // default sort - descending (newest first)
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      // Map frontend field names to database field names
      const fieldMap = {
        'date': 'createdAt',
        'total': 'total',
        'customerName': 'customerName',
        'invoiceNumber': 'invoiceNumber'
      };
      const dbField = fieldMap[req.query.sortBy] || 'createdAt';
      sortObj = { [dbField]: sortOrder };
    }

    // Get total count for pagination
    const total = await Sale.countDocuments(query);
    
    // Get paginated results
    const sales = await Sale.find(query)
      .populate("items.inventoryId")
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    // Calculate pagination info
    const pages = Math.ceil(total / limit);
    
    res.json({
      sales,
      pagination: {
        current: page,
        pages,
        total,
        limit
      }
    });
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
    // Generate sale invoice number if not provided
    if (!req.body.invoiceNumber) {
      const count = await Sale.countDocuments();
      req.body.invoiceNumber = `SALE-${String(count + 1).padStart(6, '0')}`;
    }

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

    // Auto-generate invoice for the sale
    try {
      const userInfo = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || "Unknown User",
        role: req.user?.role || "staff",
      };
      
      await generateInvoiceFromSale(sale, userInfo);
    } catch (invoiceError) {
      console.error("Failed to generate invoice for sale:", invoiceError);
      // Don't fail the sale creation if invoice generation fails
    }

    // Create notification for new sale
    try {
      const totalItems = req.body.items.reduce((sum, item) => sum + item.quantity, 0);
      await createNotification({
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
    const currentScheduledAmount = sale.scheduledAmount || 0;
    const totalAllocatedAmount = currentPaidAmount + currentScheduledAmount;
    const remainingBalance = sale.total - totalAllocatedAmount;

    if (amount > remainingBalance) {
      return res.status(400).json({ 
        error: `Payment amount (Rs ${amount.toFixed(2)}) cannot exceed remaining balance (Rs ${remainingBalance.toFixed(2)})` 
      });
    }

    const paymentDate = date ? new Date(date) : new Date();
    const currentDate = new Date();
    
    // Check if the payment date is in the future (more than 1 day from now)
    const isScheduledPayment = paymentDate > new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    
    const oldPaymentStatus = sale.paymentStatus;
    
    // Add payment to payments array
    const paymentRecord = {
      amount,
      date: paymentDate,
      method: method || "cash",
      notes: notes || "",
      status: isScheduledPayment ? "scheduled" : "completed",
    };

    sale.payments = sale.payments || [];
    sale.payments.push(paymentRecord);

    // Update amounts and status based on whether it's scheduled or immediate
    if (isScheduledPayment) {
      // For scheduled payments, add to scheduledAmount but don't add to paidAmount yet
      sale.scheduledAmount = currentScheduledAmount + amount;
      
      // Payment status remains the same for scheduled payments
      // (they don't affect current payment status until they're processed)
    } else {
      // For immediate payments, add to paidAmount and update status
      const newPaidAmount = currentPaidAmount + amount;
      sale.paidAmount = newPaidAmount;
      
      // Determine new payment status based on total paid amount
      if (newPaidAmount >= sale.total) {
        sale.paymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        sale.paymentStatus = "partial";
      } else {
        sale.paymentStatus = "unpaid";
      }
    }

    await sale.save();

    // SYNC: Update the related Invoice (only for immediate payments)
    if (!isScheduledPayment) {
      try {
        const Invoice = require('../models/Invoice');
        const invoice = await Invoice.findOne({ relatedId: sale._id, type: 'sale' });
        if (invoice) {
          invoice.paymentStatus = sale.paymentStatus;
          invoice.paidAmount = sale.paidAmount;
          if (method) invoice.paymentMethod = method;
          if (sale.paymentStatus === "paid") {
            invoice.status = "paid";
          } else if (sale.paymentStatus === "partial") {
            invoice.status = "sent";
          }
          await invoice.save();
          console.log(`✅ Synced payment update to Invoice ${invoice._id}`);
        }
      } catch (syncError) {
        console.error('⚠️ Failed to sync payment to invoice:', syncError);
        // Don't fail the payment recording if sync fails
      }
    }

    // Create notification for payment received from customer
    try {
      let notificationTitle, notificationMessage;
      
      if (isScheduledPayment) {
        notificationTitle = "Payment Scheduled";
        notificationMessage = `Payment of Rs ${amount.toFixed(2)} scheduled for ${paymentDate.toDateString()} for sale ${sale.invoiceNumber || sale._id} from ${sale.customerName || sale.customer?.name || 'Customer'}. Payment will be processed automatically on the scheduled date.`;
      } else if (sale.paymentStatus === "paid") {
        notificationTitle = "Sale Payment Completed";
        notificationMessage = `Full payment of Rs ${amount.toFixed(2)} received for sale ${sale.invoiceNumber || sale._id} from ${sale.customerName || sale.customer?.name || 'Customer'}. Total amount: Rs ${sale.total.toFixed(2)} - Fully Paid.`;
      } else if (sale.paymentStatus === "partial") {
        const remaining = sale.total - sale.paidAmount;
        notificationTitle = "Partial Payment Received";
        notificationMessage = `Partial payment of Rs ${amount.toFixed(2)} received for sale ${sale.invoiceNumber || sale._id} from ${sale.customerName || sale.customer?.name || 'Customer'}. Total: Rs ${sale.total.toFixed(2)}, Paid: Rs ${sale.paidAmount.toFixed(2)}, Remaining: Rs ${remaining.toFixed(2)}.`;
      }

      await createNotification({
        type: isScheduledPayment ? "payment_scheduled" : "payment_received",
        title: notificationTitle,
        message: notificationMessage,
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
      // Don't fail the payment recording if notification fails
      console.error("Failed to create payment notification:", notifError);
    }

    const populatedSale = await Sale.findById(sale._id).populate("items.inventoryId");
    res.json(populatedSale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};