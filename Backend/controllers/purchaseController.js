const Purchase = require("../models/Purchase");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const { generateInvoiceFromPurchase } = require("./invoiceController");
const { getNepaliCurrentDateTime } = require("../utils/dateUtils");

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

// Get all purchases
exports.getAllPurchases = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query object for filtering
    const query = {};
    
    // Add filters if provided
    if (req.query.search) {
      query.$or = [
        { purchaseNumber: { $regex: req.query.search, $options: 'i' } },
        { supplierName: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    
    if (req.query.paymentStatus && req.query.paymentStatus !== 'all') {
      query.paymentStatus = req.query.paymentStatus;
    }
    
    if (req.query.supplierName && req.query.supplierName !== 'all') {
      query.supplierName = { $regex: req.query.supplierName, $options: 'i' };
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
        'supplierName': 'supplierName',
        'purchaseNumber': 'purchaseNumber'
      };
      const dbField = fieldMap[req.query.sortBy] || 'createdAt';
      sortObj = { [dbField]: sortOrder };
    }

    // Get total count for pagination
    const total = await Purchase.countDocuments(query);
    
    // Get paginated results
    const purchases = await Purchase.find(query)
      .populate("items.inventoryId")
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    // Debug log for filtering issues
    console.log('Purchase query:', JSON.stringify(query, null, 2));
    console.log('Found purchases count:', purchases.length);
    console.log('Total count:', total);
    console.log('Sort object:', sortObj);

    // Calculate pagination info
    const pages = Math.ceil(total / limit);
    
    res.json({
      purchases,
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
    // Generate purchase number if not provided
    if (!req.body.purchaseNumber) {
      const count = await Purchase.countDocuments();
      req.body.purchaseNumber = `PO-${String(count + 1).padStart(6, '0')}`;
    }

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
        
        // Check for low stock after update
        await checkAndCreateStockNotification(inventoryItem);
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
      // Add user tracking information
      createdBy: {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || "Unknown User",
        role: req.user?.role || "staff",
      },
    };

    // Calculate payment status based on paid amount
    const paidAmount = req.body.paidAmount || 0;
    const total = req.body.total || 0;
    
    // Validate payment amount doesn't exceed total
    if (paidAmount > total) {
      return res.status(400).json({
        error: `Payment amount (Rs ${paidAmount.toFixed(2)}) cannot exceed total amount (Rs ${total.toFixed(2)})`
      });
    }
    
    if (paidAmount >= total) {
      purchaseData.paymentStatus = 'paid';
      purchaseData.status = 'received'; // Set status to received when fully paid
    } else if (paidAmount > 0) {
      purchaseData.paymentStatus = 'partial';
    } else {
      purchaseData.paymentStatus = 'unpaid';
    }

    // If there's an initial payment, add it to the payments array
    if (paidAmount > 0) {
      purchaseData.payments = [{
        amount: paidAmount,
        date: getNepaliCurrentDateTime(),
        method: req.body.paymentMethod || 'cash',
        notes: req.body.notes || '',
      }];
    }
    
    const purchase = await Purchase.create(purchaseData);

    // Auto-generate invoice for the purchase
    try {
      const userInfo = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || "Unknown User",
        role: req.user?.role || "staff",
      };
      
      await generateInvoiceFromPurchase(purchase, userInfo);
    } catch (invoiceError) {
      console.error("Failed to generate invoice for purchase:", invoiceError);
      // Don't fail the purchase creation if invoice generation fails
    }

    // Create notification for new purchase
    try {
      const totalItems = processedItems.reduce((sum, item) => sum + item.quantity, 0);
      await Notification.create({
        type: "purchase",
        title: "New Purchase Order Created",
        message: `Purchase order ${purchase.purchaseNumber} has been created with ${totalItems} item(s) from ${req.body.supplierName || 'supplier'}.`,
        relatedId: purchase._id,
        relatedModel: "Purchase",
        metadata: {
          purchaseNumber: purchase.purchaseNumber,
          supplierName: req.body.supplierName,
          totalItems: totalItems,
          total: purchase.total,
        },
      });
    } catch (notifError) {
      // Don't fail the purchase creation if notification fails
      console.error("Failed to create notification:", notifError);
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
    if (!oldPurchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

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
          const inventory = await Inventory.findByIdAndUpdate(item.inventoryId, {
            $inc: { stock: item.quantity },
            lastPurchasePrice: item.cost,
          });

          // Check if this purchase was linked to a reorder
          const Reorder = require("../models/Reorder");
          const linkedReorder = await Reorder.findOne({
            purchaseOrderId: purchase._id,
            inventoryId: item.inventoryId,
            status: 'ordered'
          });

          if (linkedReorder) {
            // Update reorder status to received
            linkedReorder.status = 'received';
            linkedReorder.receivedQuantity = item.quantity;
            linkedReorder.resolvedAt = new Date();
            await linkedReorder.save();

            // Update inventory reorder status
            if (inventory) {
              inventory.reorderStatus = 'none';
              inventory.pendingOrderId = null;
              inventory.lastReorderDate = new Date();
              await inventory.save();
            }
          }
        }
      }
    }

    // Create notification for purchase update
    try {
      const totalItems = purchase.items.reduce((sum, item) => sum + item.quantity, 0);
      let updateMessage = `Purchase order ${purchase.purchaseNumber} has been updated.`;
      
      // Check what was updated
      const changes = [];
      if (req.body.status && req.body.status !== oldPurchase.status) {
        changes.push(`status changed to ${req.body.status}`);
      }
      if (req.body.items) {
        changes.push("items have been modified");
      }
      if (req.body.supplierName && req.body.supplierName !== oldPurchase.supplierName) {
        changes.push(`supplier changed to ${req.body.supplierName}`);
      }
      if (req.body.total && req.body.total !== oldPurchase.total) {
        changes.push(`total amount updated to ${req.body.total}`);
      }
      
      if (changes.length > 0) {
        updateMessage = `Purchase order ${purchase.purchaseNumber} has been updated: ${changes.join(", ")}.`;
      }

      await Notification.create({
        type: "purchase",
        title: "Purchase Order Updated",
        message: updateMessage,
        relatedId: purchase._id,
        relatedModel: "Purchase",
        metadata: {
          purchaseNumber: purchase.purchaseNumber,
          supplierName: purchase.supplierName,
          totalItems: totalItems,
          total: purchase.total,
          status: purchase.status,
          changes: changes,
        },
      });
    } catch (notifError) {
      // Don't fail the purchase update if notification fails
      console.error("Failed to create notification:", notifError);
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

// Record payment for a purchase
exports.recordPayment = async (req, res) => {
  try {
    const { amount, date, method, notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Payment amount must be greater than 0" });
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    const currentPaidAmount = purchase.paidAmount || 0;
    const remainingBalance = purchase.total - currentPaidAmount;

    if (amount > remainingBalance) {
      return res.status(400).json({ 
        error: `Payment amount (Rs ${amount.toFixed(2)}) cannot exceed remaining balance (Rs ${remainingBalance.toFixed(2)})` 
      });
    }

    const newPaidAmount = currentPaidAmount + amount;
    const oldPaymentStatus = purchase.paymentStatus;
    
    // Determine new payment status
    let newPaymentStatus;
    if (newPaidAmount >= purchase.total) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "unpaid";
    }

    // Add payment to payments array
    const paymentRecord = {
      amount,
      date: date ? new Date(date) : getNepaliCurrentDateTime(),
      method: method || "cash",
      notes: notes || "",
    };

    purchase.payments = purchase.payments || [];
    purchase.payments.push(paymentRecord);
    purchase.paidAmount = newPaidAmount;
    purchase.paymentStatus = newPaymentStatus;

    // Update main status when payment is completed
    if (newPaymentStatus === "paid" && purchase.status === "pending") {
      purchase.status = "received";
    }

    await purchase.save();

    // Create notification for payment made to supplier
    try {
      let notificationTitle, notificationMessage;
      
      if (newPaymentStatus === "paid") {
        notificationTitle = "Purchase Payment Completed";
        notificationMessage = `Full payment of Rs ${amount.toFixed(2)} made for purchase ${purchase.purchaseNumber} to ${purchase.supplierName}. Total amount: Rs ${purchase.total.toFixed(2)} - Fully Paid.`;
      } else if (newPaymentStatus === "partial") {
        const remaining = purchase.total - newPaidAmount;
        notificationTitle = "Partial Payment Made";
        notificationMessage = `Partial payment of Rs ${amount.toFixed(2)} made for purchase ${purchase.purchaseNumber} to ${purchase.supplierName}. Total: Rs ${purchase.total.toFixed(2)}, Paid: Rs ${newPaidAmount.toFixed(2)}, Remaining: Rs ${remaining.toFixed(2)}.`;
      }

      await Notification.create({
        type: "payment_made",
        title: notificationTitle,
        message: notificationMessage,
        relatedId: purchase._id,
        relatedModel: "Purchase",
        metadata: {
          purchaseNumber: purchase.purchaseNumber,
          supplierName: purchase.supplierName,
          paymentAmount: amount,
          totalAmount: purchase.total,
          paidAmount: newPaidAmount,
          remainingAmount: purchase.total - newPaidAmount,
          paymentStatus: newPaymentStatus,
          previousPaymentStatus: oldPaymentStatus,
          paymentMethod: method || "cash",
        },
      });
    } catch (notifError) {
      // Don't fail the payment recording if notification fails
      console.error("Failed to create payment notification:", notifError);
    }

    const populatedPurchase = await Purchase.findById(purchase._id).populate("items.inventoryId");
    res.json(populatedPurchase);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
// Get suppliers for purchase order creation
exports.getSuppliersForPurchase = async (req, res) => {
  try {
    const Supplier = require("../models/Supplier");
    
    const suppliers = await Supplier.find({ isActive: true })
      .select('name email phone contactPerson paymentTerms averageLeadTimeDays')
      .sort({ name: 1 });

    res.json({ 
      data: suppliers,
      message: 'Suppliers retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching suppliers for purchase:', error);
    res.status(500).json({ 
      error: 'Failed to fetch suppliers',
      details: error.message 
    });
  }
};