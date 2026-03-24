const Purchase = require("../models/Purchase");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const { generateInvoiceFromPurchase } = require("./invoiceController");
const { getNepaliCurrentDateTime } = require("../utils/dateUtils");
const { createNotification } = require("../utils/notificationHelper");

// Expiry notification function removed - notifications were too frequent and annoying
// Visual banners on inventory page are sufficient for expiry tracking

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

// Get upcoming products (pending purchases with a future expected delivery date)
exports.getUpcomingProducts = async (req, res) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // start of today

    // Only purchases still in "pending" status with a delivery date set
    // This will show ALL pending purchases with delivery dates (past, present, and future)
    // The frontend can filter by date if needed
    const purchases = await Purchase.find({
      status: 'pending',
      expectedDeliveryDate: { $exists: true, $ne: null },
    })
      .populate('items.inventoryId')
      .sort({ expectedDeliveryDate: 1 });

    // Flatten to per-item view with all necessary details
    const upcomingProducts = [];
    for (const purchase of purchases) {
      for (const item of purchase.items) {
        upcomingProducts.push({
          purchaseId: purchase._id,
          purchaseNumber: purchase.purchaseNumber,
          supplierName: purchase.supplierName,
          expectedDeliveryDate: purchase.expectedDeliveryDate,
          itemName: item.name,
          category: item.category || 'Other',
          quantity: item.quantity,
          costPrice: item.cost,
          sellingPrice: item.sellingPrice || item.inventoryId?.price || 0,
          total: item.total,
          inventoryId: item.inventoryId?._id || null,
          paymentStatus: purchase.paymentStatus,
        });
      }
    }

    res.json({
      upcomingProducts,
      totalPurchases: purchases.length,
      totalItems: upcomingProducts.length,
    });
  } catch (err) {
    console.error('Error fetching upcoming products:', err);
    res.status(500).json({ error: err.message });
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

    // Check if this is a future delivery (items should NOT be added to inventory yet)
    const deliveryDate = req.body.expectedDeliveryDate ? new Date(req.body.expectedDeliveryDate) : null;
    // Compare dates in Nepal timezone (UTC+5:45) to avoid UTC midnight mismatches
    const nowNPT = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }));
    const todayNPT = new Date(nowNPT.getFullYear(), nowNPT.getMonth(), nowNPT.getDate());
    let deliveryDateNPT = null;
    if (deliveryDate) {
      const d = new Date(deliveryDate.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }));
      deliveryDateNPT = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    const isFutureDelivery = deliveryDateNPT && deliveryDateNPT > todayNPT;

    // Process items — only touch inventory for immediate deliveries
    const processedItems = [];
    
    for (const item of req.body.items) {
      let inventoryItem;
      
      // Always try to find an existing inventory record to link
      inventoryItem = await Inventory.findOne({ name: item.name });
      
      if (isFutureDelivery) {
        // Future delivery: do NOT add stock now — just link to existing item if it exists
        // Stock will be added by the delivery scheduler when the date arrives
        processedItems.push({
          ...item,
          inventoryId: inventoryItem ? inventoryItem._id : null,
        });
        continue;
      }

      // Immediate delivery — update/create inventory now
      if (inventoryItem) {
        // Item exists, update stock and cost/price if needed
        inventoryItem.stock += item.quantity;
        if (item.cost && item.cost > 0) {
          inventoryItem.cost = item.cost;
        }
        if (item.sellingPrice && item.sellingPrice > 0) {
          inventoryItem.price = item.sellingPrice;
        }
        // Update supplier information
        if (req.body.supplierName) {
          inventoryItem.supplier = req.body.supplierName;
        }
        if (req.body.supplierId) {
          inventoryItem.preferredSupplierId = req.body.supplierId;
        }
        // Update expiry date if provided (for food items)
        if (item.expiryDate) {
          inventoryItem.expiryDate = new Date(item.expiryDate);
        }
        // Update category type if it's a food item
        const foodKeywords = ['food', 'beverages', 'dairy', 'produce', 'frozen', 'bakery', 'meat', 'poultry', 'seafood', 'snacks', 'fresh'];
        const isFoodItem = item.category && foodKeywords.some(keyword => 
          item.category.toLowerCase().includes(keyword.toLowerCase())
        );
        if (isFoodItem) {
          inventoryItem.categoryType = 'food';
        }
        await inventoryItem.save();
        
        // Check for low stock after update
        await checkAndCreateStockNotification(inventoryItem);
      } else {
        // Create new inventory item
        const sku = item.name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 8) + '-' + Date.now().toString().slice(-6);
        
        const foodKeywords = ['food', 'beverages', 'dairy', 'produce', 'frozen', 'bakery', 'meat', 'poultry', 'seafood', 'snacks', 'fresh'];
        const isFoodItem = item.category && foodKeywords.some(keyword => 
          item.category.toLowerCase().includes(keyword.toLowerCase())
        );
        
        const inventoryData = {
          name: item.name,
          sku: sku,
          category: item.category || 'Other',
          price: item.sellingPrice || item.cost || 0,
          cost: item.cost || 0,
          stock: item.quantity,
          reorderLevel: 5,
          supplier: req.body.supplierName || 'Unknown',
          preferredSupplierId: req.body.supplierId || null,
          location: 'Warehouse',
          categoryType: isFoodItem ? 'food' : 'non-food',
        };
        
        if (item.expiryDate) {
          inventoryData.expiryDate = new Date(item.expiryDate);
        }
        
        inventoryItem = await Inventory.create(inventoryData);
      }
      
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

    // Debug: Log items to verify category is included
    console.log('📝 Creating purchase with items:', JSON.stringify(processedItems.map(item => ({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      cost: item.cost
    })), null, 2));

    // Calculate payment status based on installment plan
    const paymentInstallments = req.body.paymentInstallments || [];
    const total = req.body.total || 0;

    const todayEnd = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }));
    todayEnd.setHours(23, 59, 59, 999);

    let paidAmount = 0;
    let scheduledAmount = 0;
    const payments = [];

    for (const inst of paymentInstallments) {
      if (!inst.amount || inst.amount <= 0) continue;
      const dueDate = inst.dueDate ? new Date(inst.dueDate) : null;
      const isScheduled = dueDate && dueDate > todayEnd;
      payments.push({
        amount: inst.amount,
        date: isScheduled ? dueDate : (dueDate || getNepaliCurrentDateTime()),
        method: inst.method || 'cash',
        notes: '',
        status: isScheduled ? 'scheduled' : 'completed',
      });
      if (isScheduled) {
        scheduledAmount += inst.amount;
      } else {
        paidAmount += inst.amount;
      }
    }

    // Validate totals
    if (paidAmount + scheduledAmount > total) {
      return res.status(400).json({
        error: `Total payment plan (Rs ${(paidAmount + scheduledAmount).toFixed(2)}) cannot exceed purchase total (Rs ${total.toFixed(2)})`
      });
    }

    if (payments.length > 0) {
      purchaseData.payments = payments;
    }
    purchaseData.paidAmount = paidAmount;
    purchaseData.scheduledAmount = scheduledAmount;

    if (paidAmount >= total && !isFutureDelivery) {
      // Only auto-receive if there is no future delivery date
      purchaseData.paymentStatus = 'paid';
      purchaseData.status = 'received';
    } else if (paidAmount >= total) {
      // Fully paid but delivery is pending
      purchaseData.paymentStatus = 'paid';
    } else if (scheduledAmount > 0 && paidAmount + scheduledAmount >= total) {
      purchaseData.paymentStatus = 'scheduled';
    } else if (paidAmount > 0 || scheduledAmount > 0) {
      purchaseData.paymentStatus = 'partial';
    } else {
      purchaseData.paymentStatus = 'unpaid';
    }
    
    const purchase = await Purchase.create(purchaseData);

    // Debug: Log what was actually saved
    console.log('✅ Purchase created with items:', JSON.stringify(purchase.items.map(item => ({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      cost: item.cost
    })), null, 2));

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
      await createNotification({
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

      await createNotification({
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
    const currentScheduledAmount = purchase.scheduledAmount || 0;
    const totalAllocatedAmount = currentPaidAmount + currentScheduledAmount;
    const remainingBalance = purchase.total - totalAllocatedAmount;

    if (amount > remainingBalance) {
      return res.status(400).json({ 
        error: `Payment amount (Rs ${amount.toFixed(2)}) cannot exceed remaining balance (Rs ${remainingBalance.toFixed(2)})` 
      });
    }

    const paymentDate = date ? new Date(date) : new Date();
    // Use Nepal timezone for date comparison to avoid UTC midnight mismatches
    const nowNPT = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }));
    const currentDate = new Date(nowNPT.getFullYear(), nowNPT.getMonth(), nowNPT.getDate());

    const pdNPT = new Date(paymentDate.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }));
    const paymentDateOnly = new Date(pdNPT.getFullYear(), pdNPT.getMonth(), pdNPT.getDate());

    // Check if the payment date is in the future (any date after today)
    // Even 1 day in the future should be scheduled
    const isScheduledPayment = paymentDateOnly > currentDate;
    
    const oldPaymentStatus = purchase.paymentStatus;
    
    // Add payment to payments array
    const paymentRecord = {
      amount,
      date: paymentDate,
      method: method || "cash",
      notes: notes || "",
      status: isScheduledPayment ? "scheduled" : "completed",
    };

    purchase.payments = purchase.payments || [];
    purchase.payments.push(paymentRecord);

    // Update amounts and status based on whether it's scheduled or immediate
    if (isScheduledPayment) {
      // For scheduled payments, add to scheduledAmount but don't add to paidAmount yet
      purchase.scheduledAmount = currentScheduledAmount + amount;
      
      // Determine payment status including scheduled amounts
      const totalPlannedAmount = currentPaidAmount + purchase.scheduledAmount;
      
      if (totalPlannedAmount >= purchase.total) {
        purchase.paymentStatus = "scheduled"; // Fully scheduled
      } else if (currentPaidAmount > 0 || purchase.scheduledAmount > 0) {
        purchase.paymentStatus = "partial"; // Partially paid/scheduled
      } else {
        purchase.paymentStatus = "unpaid";
      }
      
      console.log(`📅 Scheduled payment of Rs ${amount} for ${paymentDate.toDateString()}`);
      
    } else {
      // For immediate payments, add to paidAmount
      const newPaidAmount = currentPaidAmount + amount;
      purchase.paidAmount = newPaidAmount;
      
      // Determine new payment status
      let newPaymentStatus;
      const totalPlannedAmount = newPaidAmount + currentScheduledAmount;
      
      if (newPaidAmount >= purchase.total) {
        newPaymentStatus = "paid";
      } else if (newPaidAmount > 0 || currentScheduledAmount > 0) {
        newPaymentStatus = "partial";
      } else {
        newPaymentStatus = "unpaid";
      }
      
      purchase.paymentStatus = newPaymentStatus;
      
      // Update main status when payment is completed
      if (newPaymentStatus === "paid" && purchase.status === "pending") {
        purchase.status = "received";
      }
    }

    await purchase.save();

    // SYNC: Update the related Invoice (only for immediate payments)
    if (!isScheduledPayment) {
      try {
        const Invoice = require('../models/Invoice');
        const invoice = await Invoice.findOne({ relatedId: purchase._id, type: 'purchase' });
        if (invoice) {
          invoice.paymentStatus = purchase.paymentStatus;
          invoice.paidAmount = purchase.paidAmount;
          if (method) invoice.paymentMethod = method;
          if (purchase.paymentStatus === "paid") {
            invoice.status = "paid";
          } else if (purchase.paymentStatus === "partial") {
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

    // Create notification for payment made to supplier
    try {
      let notificationTitle, notificationMessage;
      
      if (isScheduledPayment) {
        notificationTitle = "Payment Scheduled";
        notificationMessage = `Payment of Rs ${amount.toFixed(2)} scheduled for ${paymentDate.toDateString()} for purchase ${purchase.purchaseNumber} to ${purchase.supplierName}.`;
      } else {
        if (purchase.paymentStatus === "paid") {
          notificationTitle = "Purchase Payment Completed";
          notificationMessage = `Full payment of Rs ${amount.toFixed(2)} made for purchase ${purchase.purchaseNumber} to ${purchase.supplierName}. Total amount: Rs ${purchase.total.toFixed(2)} - Fully Paid.`;
        } else if (purchase.paymentStatus === "partial") {
          const remaining = purchase.total - purchase.paidAmount;
          notificationTitle = "Partial Payment Made";
          notificationMessage = `Partial payment of Rs ${amount.toFixed(2)} made for purchase ${purchase.purchaseNumber} to ${purchase.supplierName}. Total: Rs ${purchase.total.toFixed(2)}, Paid: Rs ${purchase.paidAmount.toFixed(2)}, Remaining: Rs ${remaining.toFixed(2)}.`;
        }
      }

      await createNotification({
        type: isScheduledPayment ? "payment_scheduled" : "payment_made",
        title: notificationTitle,
        message: notificationMessage,
        relatedId: purchase._id,
        relatedModel: "Purchase",
        metadata: {
          purchaseNumber: purchase.purchaseNumber,
          supplierName: purchase.supplierName,
          paymentAmount: amount,
          totalAmount: purchase.total,
          paidAmount: purchase.paidAmount,
          scheduledAmount: purchase.scheduledAmount,
          scheduledDate: isScheduledPayment ? paymentDate : null,
          remainingAmount: purchase.total - purchase.paidAmount,
          paymentStatus: purchase.paymentStatus,
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

// Manual trigger for delivery processing (for testing/admin use)
exports.triggerDeliveryProcessing = async (req, res) => {
  try {
    const { processDeliveries } = require("../services/paymentScheduler");
    console.log("🔧 Manual delivery processing triggered by user");
    const result = await processDeliveries();
    res.json({
      success: true,
      message: `Delivery processing completed. ${result.receivedCount} purchase(s) received and ${result.itemsAddedToInventory} item(s) added to inventory.`,
      result
    });
  } catch (error) {
    console.error('Error in manual delivery processing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process deliveries',
      details: error.message
    });
  }
};

// ==================== KHALTI PAYMENT ENDPOINTS FOR PURCHASES ====================

const { initiateKhaltiPayment, verifyKhaltiPayment } = require("../utils/khaltiService");

// Initiate Khalti payment for a purchase (payment on existing purchase)
exports.initiateKhaltiPurchasePayment = async (req, res) => {
  try {
    const { purchaseId, amount } = req.body;

    if (!purchaseId) {
      return res.status(400).json({ error: "Purchase ID is required" });
    }

    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    const paidAmount = purchase.paidAmount || 0;
    const scheduledAmount = purchase.scheduledAmount || 0;
    const remaining = purchase.total - paidAmount - scheduledAmount;

    const paymentAmount = amount || remaining;

    if (paymentAmount <= 0) {
      return res.status(400).json({ error: "No remaining balance to pay" });
    }

    if (paymentAmount > remaining) {
      return res.status(400).json({
        error: `Payment amount (Rs ${paymentAmount}) exceeds remaining balance (Rs ${remaining.toFixed(2)})`,
      });
    }

    const purchaseOrderId = `${purchase.purchaseNumber}-${Date.now().toString().slice(-6)}`;

    const productDetails = purchase.items.map((item) => ({
      id: item.inventoryId?.toString() || item.name,
      name: item.name,
      total_price: item.total,
      quantity: item.quantity,
      unit_price: item.cost,
    }));

    const returnUrl =
      process.env.KHALTI_PURCHASE_RETURN_URL ||
      `${process.env.KHALTI_WEBSITE_URL || "http://localhost:5173"}/purchases/payment-success`;

    const khaltiResponse = await initiateKhaltiPayment({
      amount: paymentAmount,
      purchaseOrderId,
      purchaseOrderName: `Purchase Payment - ${purchase.purchaseNumber}`,
      customerInfo: {
        name: purchase.supplierName,
        email: purchase.supplierEmail || "",
        phone: purchase.supplierPhone || "9800000000",
      },
      productDetails,
      returnUrl,
      usePurchaseKey: true,
    });

    res.json({
      success: true,
      pidx: khaltiResponse.pidx,
      payment_url: khaltiResponse.payment_url,
      expires_at: khaltiResponse.expires_at,
      purchaseId: purchase._id,
      amount: paymentAmount,
    });
  } catch (err) {
    console.error("Khalti purchase payment initiation error:", err);
    res.status(500).json({ error: err.message || "Failed to initiate Khalti payment" });
  }
};

// Verify Khalti payment for a purchase and create the purchase record
exports.verifyKhaltiPurchasePayment = async (req, res) => {
  try {
    const { pidx, purchaseId, amount } = req.body;

    if (!pidx) {
      return res.status(400).json({ error: "Payment identifier (pidx) is required" });
    }

    const verificationResult = await verifyKhaltiPayment(pidx, true);

    if (!verificationResult.isCompleted) {
      return res.status(400).json({
        error: verificationResult.message,
        status: verificationResult.status,
      });
    }

    // If purchaseId is provided, record the payment on the purchase
    if (purchaseId) {
      const purchase = await Purchase.findById(purchaseId);
      if (purchase) {
        const paymentAmount = amount || verificationResult.total_amount;
        const currentPaid = purchase.paidAmount || 0;
        const currentScheduled = purchase.scheduledAmount || 0;
        const remaining = purchase.total - currentPaid - currentScheduled;

        if (paymentAmount <= remaining + 0.001) {
          purchase.payments = purchase.payments || [];
          purchase.payments.push({
            amount: paymentAmount,
            date: new Date(),
            method: "khalti",
            notes: `Khalti payment - txn: ${verificationResult.transaction_id}`,
            status: "completed",
          });
          purchase.paidAmount = currentPaid + paymentAmount;

          if (purchase.paidAmount >= purchase.total) {
            purchase.paymentStatus = "paid";
            if (purchase.status === "pending") purchase.status = "received";
          } else if (purchase.paidAmount > 0) {
            purchase.paymentStatus = "partial";
          }

          await purchase.save();

          // Sync invoice
          try {
            const Invoice = require("../models/Invoice");
            const invoice = await Invoice.findOne({ relatedId: purchase._id, type: "purchase" });
            if (invoice) {
              invoice.paymentStatus = purchase.paymentStatus;
              invoice.paidAmount = purchase.paidAmount;
              invoice.paymentMethod = "khalti";
              if (purchase.paymentStatus === "paid") invoice.status = "paid";
              await invoice.save();
            }
          } catch (syncErr) {
            console.error("Failed to sync invoice after Khalti payment:", syncErr);
          }
        }
      }
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      pidx: verificationResult.pidx,
      transaction_id: verificationResult.transaction_id,
      total_amount: verificationResult.total_amount,
      status: verificationResult.status,
    });
  } catch (err) {
    console.error("Khalti purchase payment verification error:", err);
    res.status(500).json({ error: err.message || "Failed to verify Khalti payment" });
  }
};

// Get Khalti wallet balance (sales collected - purchases paid via Khalti)
exports.getKhaltiBalance = async (req, res) => {
  try {
    const Sale = require("../models/Sale");

    // Sum all completed Khalti payments received from sales
    const salesResult = await Sale.aggregate([
      { $unwind: "$payments" },
      { $match: { "payments.method": "khalti", "payments.status": "completed" } },
      { $group: { _id: null, total: { $sum: "$payments.amount" } } },
    ]);

    // Sum all completed Khalti payments made for purchases
    const purchasesResult = await Purchase.aggregate([
      { $unwind: "$payments" },
      { $match: { "payments.method": "khalti", "payments.status": "completed" } },
      { $group: { _id: null, total: { $sum: "$payments.amount" } } },
    ]);

    const khaltiIn = salesResult[0]?.total || 0;
    const khaltiOut = purchasesResult[0]?.total || 0;
    const balance = khaltiIn - khaltiOut;

    res.json({ khaltiIn, khaltiOut, balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
