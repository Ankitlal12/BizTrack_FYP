const Reorder = require("../models/Reorder");
const Inventory = require("../models/Inventory");
const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");
const Notification = require("../models/Notification");
const { calculateReorderQuantity, calculatePriority, getUrgencyLevel } = require("../utils/reorderCalculator");
const { createNotification } = require("../utils/notificationHelper");

/**
 * Get low stock report with analytics
 */
exports.getLowStockReport = async (req, res) => {
  try {
    const { category, supplier, urgency, reorderStatus, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

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

    if (reorderStatus && reorderStatus !== 'all') {
      query.reorderStatus = reorderStatus;
    }

    // Get low stock items
    const lowStockItems = await Inventory.find(query)
      .populate('preferredSupplierId', 'name contactPerson phone email')
      .sort({ stock: 1 }) // Most critical first
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate analytics for each item
    const itemsWithAnalytics = await Promise.all(
      lowStockItems.map(async (item) => {
        try {
          const analytics = await calculateReorderQuantity(item._id);
          const priority = calculatePriority(item, analytics);
          const urgencyLevel = getUrgencyLevel(priority);

          return {
            ...item.toObject(),
            analytics,
            priority,
            urgencyLevel
          };
        } catch (error) {
          console.error(`Error calculating analytics for item ${item._id}:`, error);
          return {
            ...item.toObject(),
            analytics: {
              suggestedQuantity: item.reorderQuantity || 10,
              averageDailySales: 0,
              currentStock: item.stock,
              reorderLevel: item.reorderLevel,
              daysUntilStockout: 999,
              calculations: {}
            },
            priority: 0,
            urgencyLevel: 'low'
          };
        }
      })
    );

    // Filter by urgency if specified
    let filteredItems = itemsWithAnalytics;
    if (urgency && urgency !== 'all') {
      filteredItems = itemsWithAnalytics.filter(item => item.urgencyLevel === urgency);
    }

    // Sort by priority (highest first)
    filteredItems.sort((a, b) => b.priority - a.priority);

    const total = await Inventory.countDocuments(query);

    res.json({
      data: filteredItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error generating low stock report:', error);
    res.status(500).json({ 
      error: 'Failed to generate low stock report',
      details: error.message 
    });
  }
};

/**
 * Get reorder by ID
 */
exports.getReorderById = async (req, res) => {
  try {
    const reorder = await Reorder.findById(req.params.id)
      .populate('inventoryId', 'name sku category price cost stock')
      .populate('supplierId', 'name contactPerson phone email')
      .populate('purchaseOrderId', 'purchaseNumber status total');

    if (!reorder) {
      return res.status(404).json({ error: 'Reorder not found' });
    }

    res.json({ data: reorder });
  } catch (error) {
    console.error('Error fetching reorder:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reorder',
      details: error.message 
    });
  }
};

/**
 * Get all reorders with filtering
 */
exports.getAllReorders = async (req, res) => {
  try {
    const { 
      status, 
      inventoryId, 
      supplierId, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 10 
    } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (inventoryId) {
      query.inventoryId = inventoryId;
    }

    if (supplierId) {
      query.supplierId = supplierId;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const reorders = await Reorder.find(query)
      .populate('inventoryId', 'name sku category')
      .populate('supplierId', 'name contactPerson')
      .populate('purchaseOrderId', 'purchaseNumber status')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Reorder.countDocuments(query);

    res.json({
      data: reorders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reorders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reorders',
      details: error.message 
    });
  }
};

/**
 * Create manual reorder request
 */
exports.createReorder = async (req, res) => {
  try {
    const { inventoryId, supplierId, suggestedQuantity, notes } = req.body;

    // Validate inventory item
    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Validate supplier if provided
    if (supplierId) {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
    }

    // Calculate analytics
    const analytics = await calculateReorderQuantity(inventoryId);

    // Generate reorder number
    const lastReorder = await Reorder.findOne().sort({ createdAt: -1 });
    let reorderNumber = 'RO-000001';
    if (lastReorder && lastReorder.reorderNumber) {
      const lastNumber = parseInt(lastReorder.reorderNumber.split('-')[1]);
      reorderNumber = `RO-${String(lastNumber + 1).padStart(6, '0')}`;
    }

    // Create reorder
    const reorder = await Reorder.create({
      reorderNumber,
      inventoryId,
      supplierId: supplierId || inventory.preferredSupplierId,
      triggerType: 'manual',
      triggeredBy: {
        userId: req.user._id,
        name: req.user.name,
        role: req.user.role
      },
      stockAtTrigger: inventory.stock,
      reorderLevel: inventory.reorderLevel,
      suggestedQuantity: suggestedQuantity || analytics.suggestedQuantity,
      notes
    });

    // Update inventory reorder status
    inventory.reorderStatus = 'needed';
    await inventory.save();

    // Create notification
    await createNotification({
      type: 'reorder_created',
      title: 'Reorder Request Created',
      message: `Manual reorder request created for ${inventory.name} (SKU: ${inventory.sku})`,
      relatedId: reorder._id,
      relatedModel: 'Reorder',
      metadata: {
        inventoryId: inventory._id,
        itemName: inventory.name,
        sku: inventory.sku,
        suggestedQuantity: reorder.suggestedQuantity,
        triggeredBy: req.user.name
      }
    });

    const populatedReorder = await Reorder.findById(reorder._id)
      .populate('inventoryId', 'name sku category')
      .populate('supplierId', 'name contactPerson');

    res.status(201).json({ 
      data: populatedReorder,
      message: 'Reorder request created successfully'
    });
  } catch (error) {
    console.error('Error creating reorder:', error);
    res.status(500).json({ 
      error: 'Failed to create reorder',
      details: error.message 
    });
  }
};

/**
 * Create quick reorder from notification
 */
exports.createQuickReorder = async (req, res) => {
  try {
    const { inventoryId, quantity, supplierId } = req.body;

    // Validate required fields
    if (!inventoryId) {
      return res.status(400).json({ error: 'Inventory ID is required' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // Validate inventory item
    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Use preferred supplier if not provided
    const finalSupplierId = supplierId || inventory.preferredSupplierId;

    // Generate reorder number
    const lastReorder = await Reorder.findOne().sort({ createdAt: -1 });
    let reorderNumber = 'RO-000001';
    if (lastReorder && lastReorder.reorderNumber) {
      const lastNumber = parseInt(lastReorder.reorderNumber.split('-')[1]);
      reorderNumber = `RO-${String(lastNumber + 1).padStart(6, '0')}`;
    }

    // Create reorder
    const reorderData = {
      reorderNumber,
      inventoryId,
      supplierId: finalSupplierId,
      triggerType: inventory.stock <= 0 ? 'out_of_stock' : 'manual',
      triggeredBy: {
        userId: req.user._id,
        name: req.user.name,
        role: req.user.role
      },
      stockAtTrigger: inventory.stock,
      reorderLevel: inventory.reorderLevel,
      suggestedQuantity: quantity
    };

    const reorder = await Reorder.create(reorderData);

    // IMPROVEMENT: Immediately restock the inventory
    inventory.stock += quantity;
    inventory.reorderStatus = 'none'; // Reset status since we're restocking
    inventory.lastReorderDate = new Date();
    await inventory.save();

    // Mark related notifications as read
    await Notification.updateMany(
      {
        type: { $in: ['low_stock', 'out_of_stock'] },
        relatedId: inventoryId,
        read: false
      },
      { read: true }
    );

    // IMPROVEMENT: Automatically create purchase order
    
    // Generate purchase number
    const Purchase = require("../models/Purchase");
    const lastPurchase = await Purchase.findOne().sort({ createdAt: -1 });
    let purchaseNumber = 'PO-000001';
    if (lastPurchase && lastPurchase.purchaseNumber) {
      const lastNumber = parseInt(lastPurchase.purchaseNumber.split('-')[1]);
      purchaseNumber = `PO-${String(lastNumber + 1).padStart(6, '0')}`;
    }

    // Get supplier information
    let supplierInfo = {
      name: 'Unknown Supplier',
      email: '',
      phone: ''
    };

    if (finalSupplierId) {
      const Supplier = require("../models/Supplier");
      const supplier = await Supplier.findById(finalSupplierId);
      if (supplier) {
        supplierInfo = {
          name: supplier.name,
          email: supplier.email || '',
          phone: supplier.phone || ''
        };
      }
    }

    // Calculate costs
    const unitCost = inventory.lastPurchasePrice || inventory.cost;
    const totalCost = unitCost * quantity;

    // Create purchase order with current timestamp
    const purchase = await Purchase.create({
      purchaseNumber,
      supplierName: supplierInfo.name,
      supplierEmail: supplierInfo.email,
      supplierPhone: supplierInfo.phone,
      items: [{
        inventoryId: inventory._id,
        name: inventory.name,
        quantity: quantity,
        cost: unitCost,
        total: totalCost
      }],
      subtotal: totalCost,
      total: totalCost,
      status: 'received', // Mark as received since we already restocked
      paymentStatus: 'unpaid',
      paidAmount: 0,
      notes: `Auto-created from reorder ${reorderNumber} - Immediate restocking`,
      createdBy: {
        userId: req.user._id,
        name: req.user.name,
        role: req.user.role
      },
      // Explicitly set current timestamp to ensure proper ordering
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Update reorder with purchase order info
    reorder.status = 'received';
    reorder.purchaseOrderId = purchase._id;
    reorder.orderedQuantity = quantity;
    reorder.receivedQuantity = quantity;
    reorder.resolvedAt = new Date();
    reorder.resolvedBy = {
      userId: req.user._id,
      name: req.user.name
    };
    await reorder.save();

    // Create success notification for low-stock purchase
    await createNotification({
      type: 'low_stock_purchase',
      title: 'Low Stock Item Restocked',
      message: `✅ Purchase order ${purchaseNumber} created for low-stock item "${inventory.name}". Stock increased from ${inventory.stock - quantity} to ${inventory.stock} units.`,
      relatedId: purchase._id,
      relatedModel: 'Purchase',
      metadata: {
        purchaseNumber: purchaseNumber,
        reorderNumber: reorderNumber,
        itemName: inventory.name,
        quantity: quantity,
        previousStock: inventory.stock - quantity,
        newStock: inventory.stock,
        isLowStockPurchase: true,
        urgency: inventory.stock - quantity <= 0 ? 'critical' : 'high'
      }
    });

    const populatedReorder = await Reorder.findById(reorder._id)
      .populate('inventoryId', 'name sku category')
      .populate('supplierId', 'name contactPerson')
      .populate('purchaseOrderId', 'purchaseNumber status total');

    console.log('Sending response with populated reorder');
    res.status(201).json({ 
      data: {
        ...populatedReorder.toObject(),
        purchaseNumber: purchase.purchaseNumber,
        purchaseId: purchase._id,
        newStock: inventory.stock
      },
      message: 'Quick reorder completed successfully - Inventory restocked and purchase order created'
    });
  } catch (error) {
    console.error('Error creating quick reorder:', error);
    res.status(500).json({ 
      error: 'Failed to create quick reorder',
      details: error.message 
    });
  }
};

/**
 * Approve reorder
 */
exports.approveReorder = async (req, res) => {
  try {
    const reorder = await Reorder.findById(req.params.id);
    if (!reorder) {
      return res.status(404).json({ error: 'Reorder not found' });
    }

    if (reorder.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Only pending reorders can be approved'
      });
    }

    // Update reorder status
    reorder.status = 'approved';
    reorder.resolvedBy = {
      userId: req.user._id,
      name: req.user.name
    };
    await reorder.save();

    // Create notification
    await createNotification({
      type: 'reorder_approved',
      title: 'Reorder Approved',
      message: `Reorder request approved for ${reorder.inventoryId.name}`,
      relatedId: reorder._id,
      relatedModel: 'Reorder',
      metadata: {
        approvedBy: req.user.name,
        suggestedQuantity: reorder.suggestedQuantity
      }
    });

    const populatedReorder = await Reorder.findById(reorder._id)
      .populate('inventoryId', 'name sku category')
      .populate('supplierId', 'name contactPerson');

    res.json({ 
      data: populatedReorder,
      message: 'Reorder approved successfully'
    });
  } catch (error) {
    console.error('Error approving reorder:', error);
    res.status(500).json({ 
      error: 'Failed to approve reorder',
      details: error.message 
    });
  }
};

/**
 * Create purchase order from reorder
 */
exports.createPurchaseFromReorder = async (req, res) => {
  try {
    const { reorderId } = req.params;
    const { quantity, notes } = req.body;

    const reorder = await Reorder.findById(reorderId)
      .populate('inventoryId')
      .populate('supplierId');

    if (!reorder) {
      return res.status(404).json({ error: 'Reorder not found' });
    }

    if (!reorder.supplierId) {
      return res.status(400).json({ 
        error: 'No supplier specified for this reorder'
      });
    }

    const inventory = reorder.inventoryId;
    const supplier = reorder.supplierId;
    const orderQuantity = quantity || reorder.suggestedQuantity;

    // Generate purchase number
    const lastPurchase = await Purchase.findOne().sort({ createdAt: -1 });
    let purchaseNumber = 'PO-000001';
    if (lastPurchase && lastPurchase.purchaseNumber) {
      const lastNumber = parseInt(lastPurchase.purchaseNumber.split('-')[1]);
      purchaseNumber = `PO-${String(lastNumber + 1).padStart(6, '0')}`;
    }

    // Calculate costs
    const unitCost = inventory.lastPurchasePrice || inventory.cost;
    const total = unitCost * orderQuantity;

    // Create purchase order
    const purchase = await Purchase.create({
      purchaseNumber,
      supplierName: supplier.name,
      supplierEmail: supplier.email,
      supplierPhone: supplier.phone,
      items: [{
        inventoryId: inventory._id,
        name: inventory.name,
        quantity: orderQuantity,
        cost: unitCost,
        total: total
      }],
      subtotal: total,
      total: total,
      status: 'pending',
      notes: notes || `Created from reorder request #${reorder._id}`,
      createdBy: {
        userId: req.user._id,
        name: req.user.name,
        role: req.user.role
      }
    });

    // Update reorder
    reorder.status = 'ordered';
    reorder.purchaseOrderId = purchase._id;
    reorder.orderedQuantity = orderQuantity;
    reorder.resolvedAt = new Date();
    reorder.resolvedBy = {
      userId: req.user._id,
      name: req.user.name
    };
    await reorder.save();

    // Update inventory
    inventory.reorderStatus = 'ordered';
    inventory.pendingOrderId = purchase._id;
    await inventory.save();

    res.status(201).json({ 
      data: { purchase, reorder },
      message: 'Purchase order created successfully from reorder'
    });
  } catch (error) {
    console.error('Error creating purchase from reorder:', error);
    res.status(500).json({ 
      error: 'Failed to create purchase order',
      details: error.message 
    });
  }
};

/**
 * Create bulk purchase orders from multiple reorders
 */
exports.createBulkReorder = async (req, res) => {
  try {
    const { items } = req.body; // Array of { inventoryId, quantity, supplierId }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Items array is required'
      });
    }

    // Group items by supplier
    const itemsBySupplier = {};
    
    for (const item of items) {
      const inventory = await Inventory.findById(item.inventoryId);
      if (!inventory) {
        return res.status(404).json({ 
          error: `Inventory item not found: ${item.inventoryId}`
        });
      }

      const supplierId = item.supplierId || inventory.preferredSupplierId;
      if (!supplierId) {
        return res.status(400).json({ 
          error: `No supplier specified for item: ${inventory.name}`
        });
      }

      if (!itemsBySupplier[supplierId]) {
        itemsBySupplier[supplierId] = [];
      }

      itemsBySupplier[supplierId].push({
        ...item,
        inventory
      });
    }

    const createdPurchases = [];
    const createdReorders = [];

    // Create purchase orders for each supplier
    for (const [supplierId, supplierItems] of Object.entries(itemsBySupplier)) {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res.status(404).json({ 
          error: `Supplier not found: ${supplierId}`
        });
      }

      // Generate purchase number
      const lastPurchase = await Purchase.findOne().sort({ createdAt: -1 });
      let purchaseNumber = 'PO-000001';
      if (lastPurchase && lastPurchase.purchaseNumber) {
        const lastNumber = parseInt(lastPurchase.purchaseNumber.split('-')[1]);
        purchaseNumber = `PO-${String(lastNumber + 1).padStart(6, '0')}`;
      }

      // Prepare purchase items
      const purchaseItems = [];
      let subtotal = 0;

      for (const item of supplierItems) {
        const unitCost = item.inventory.lastPurchasePrice || item.inventory.cost;
        const itemTotal = unitCost * item.quantity;
        
        purchaseItems.push({
          inventoryId: item.inventory._id,
          name: item.inventory.name,
          quantity: item.quantity,
          cost: unitCost,
          total: itemTotal
        });

        subtotal += itemTotal;
      }

      // Create purchase order
      const purchase = await Purchase.create({
        purchaseNumber,
        supplierName: supplier.name,
        supplierEmail: supplier.email,
        supplierPhone: supplier.phone,
        items: purchaseItems,
        subtotal,
        total: subtotal,
        status: 'pending',
        notes: 'Created from bulk reorder request',
        createdBy: {
          userId: req.user._id,
          name: req.user.name,
          role: req.user.role
        }
      });

      createdPurchases.push(purchase);

      // Create reorders and update inventory
      for (const item of supplierItems) {
        // Generate reorder number for each reorder
        const lastReorder = await Reorder.findOne().sort({ createdAt: -1 });
        let reorderNumber = 'RO-000001';
        if (lastReorder && lastReorder.reorderNumber) {
          const lastNumber = parseInt(lastReorder.reorderNumber.split('-')[1]);
          reorderNumber = `RO-${String(lastNumber + 1).padStart(6, '0')}`;
        }

        const reorder = await Reorder.create({
          reorderNumber,
          inventoryId: item.inventory._id,
          supplierId: supplierId,
          triggerType: 'manual',
          triggeredBy: {
            userId: req.user._id,
            name: req.user.name,
            role: req.user.role
          },
          stockAtTrigger: item.inventory.stock,
          reorderLevel: item.inventory.reorderLevel,
          suggestedQuantity: item.quantity,
          status: 'ordered',
          purchaseOrderId: purchase._id,
          orderedQuantity: item.quantity,
          resolvedAt: new Date(),
          resolvedBy: {
            userId: req.user._id,
            name: req.user.name
          }
        });

        createdReorders.push(reorder);

        // Update inventory
        item.inventory.reorderStatus = 'ordered';
        item.inventory.pendingOrderId = purchase._id;
        await item.inventory.save();
      }
    }

    res.status(201).json({ 
      data: { 
        purchases: createdPurchases,
        reorders: createdReorders
      },
      message: `Successfully created ${createdPurchases.length} purchase order(s) for ${items.length} item(s)`
    });
  } catch (error) {
    console.error('Error creating bulk reorders:', error);
    res.status(500).json({ 
      error: 'Failed to create bulk reorders',
      details: error.message 
    });
  }
};

/**
 * Cancel reorder
 */
exports.cancelReorder = async (req, res) => {
  try {
    const reorder = await Reorder.findById(req.params.id);
    if (!reorder) {
      return res.status(404).json({ error: 'Reorder not found' });
    }

    if (reorder.status === 'received') {
      return res.status(400).json({ 
        error: 'Cannot cancel received reorder'
      });
    }

    // Update reorder
    reorder.status = 'cancelled';
    reorder.resolvedAt = new Date();
    reorder.resolvedBy = {
      userId: req.user._id,
      name: req.user.name
    };
    await reorder.save();

    // Update inventory
    const inventory = await Inventory.findById(reorder.inventoryId);
    if (inventory) {
      inventory.reorderStatus = 'none';
      inventory.pendingOrderId = null;
      await inventory.save();
    }

    res.json({ 
      data: reorder,
      message: 'Reorder cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling reorder:', error);
    res.status(500).json({ 
      error: 'Failed to cancel reorder',
      details: error.message 
    });
  }
};

/**
 * Mark reorder as received (when purchase is received)
 */
exports.markReorderReceived = async (req, res) => {
  try {
    const { reorderId } = req.params;
    const { receivedQuantity } = req.body;

    const reorder = await Reorder.findById(reorderId);
    if (!reorder) {
      return res.status(404).json({ error: 'Reorder not found' });
    }

    // Update reorder
    reorder.status = 'received';
    reorder.receivedQuantity = receivedQuantity || reorder.orderedQuantity;
    reorder.resolvedAt = new Date();
    reorder.resolvedBy = {
      userId: req.user._id,
      name: req.user.name
    };
    await reorder.save();

    // Update inventory
    const inventory = await Inventory.findById(reorder.inventoryId);
    if (inventory) {
      inventory.reorderStatus = 'none';
      inventory.pendingOrderId = null;
      inventory.lastReorderDate = new Date();
      await inventory.save();
    }

    res.json({ 
      data: reorder,
      message: 'Reorder marked as received successfully'
    });
  } catch (error) {
    console.error('Error marking reorder as received:', error);
    res.status(500).json({ 
      error: 'Failed to mark reorder as received',
      details: error.message 
    });
  }
};

/**
 * Get reorder statistics
 */
exports.getReorderStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      // Total low stock items
      Inventory.countDocuments({
        $or: [
          { stock: { $lte: 0 } },
          { $expr: { $lte: ['$stock', '$reorderLevel'] } }
        ]
      }),
      
      // Out of stock items
      Inventory.countDocuments({ stock: { $lte: 0 } }),
      
      // Pending reorders
      Reorder.countDocuments({ status: 'pending' }),
      
      // Ordered reorders
      Reorder.countDocuments({ status: 'ordered' }),
      
      // Total reorder value (estimated)
      Reorder.aggregate([
        { $match: { status: { $in: ['pending', 'approved', 'ordered'] } } },
        { $lookup: { from: 'inventories', localField: 'inventoryId', foreignField: '_id', as: 'inventory' } },
        { $unwind: '$inventory' },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$suggestedQuantity', '$inventory.cost'] } } } }
      ])
    ]);

    const [lowStockCount, outOfStockCount, pendingCount, orderedCount, valueResult] = stats;
    const estimatedValue = valueResult.length > 0 ? valueResult[0].totalValue : 0;

    res.json({
      data: {
        lowStockItems: lowStockCount,
        outOfStockItems: outOfStockCount,
        pendingReorders: pendingCount,
        orderedReorders: orderedCount,
        estimatedReorderValue: estimatedValue
      }
    });
  } catch (error) {
    console.error('Error fetching reorder stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reorder statistics',
      details: error.message 
    });
  }
};