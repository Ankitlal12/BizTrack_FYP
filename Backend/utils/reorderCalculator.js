const Sale = require("../models/Sale");
const Inventory = require("../models/Inventory");

/**
 * Calculate reorder quantity and analytics for an inventory item
 * @param {String} inventoryId - MongoDB ObjectId of inventory item
 * @returns {Object} Analytics and suggested reorder quantity
 */
const calculateReorderQuantity = async (inventoryId) => {
  try {
    // Get inventory item
    const item = await Inventory.findById(inventoryId);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    // Calculate date 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get sales data from last 90 days
    const sales = await Sale.find({
      'items.inventoryId': inventoryId,
      createdAt: { $gte: ninetyDaysAgo }
    });

    // Calculate total sold in 90 days
    let totalSold90Days = 0;
    sales.forEach(sale => {
      sale.items.forEach(saleItem => {
        if (saleItem.inventoryId.toString() === inventoryId.toString()) {
          totalSold90Days += saleItem.quantity;
        }
      });
    });

    // Calculate average daily sales
    const averageDailySales = totalSold90Days / 90;
    
    // Calculate annual demand
    const annualDemand = averageDailySales * 365;

    // Calculate safety stock (lead time * average daily sales)
    const safetyStock = item.leadTimeDays * averageDailySales;

    // Calculate days until stockout
    const daysUntilStockout = averageDailySales > 0 ? 
      Math.floor(item.stock / averageDailySales) : 999;

    // Calculate suggested quantity
    // Formula: (Lead time + review period) * average daily sales + safety stock - current stock
    const reviewPeriod = 7; // Weekly review
    const suggestedQuantity = Math.max(
      Math.ceil((item.leadTimeDays + reviewPeriod) * averageDailySales + safetyStock - item.stock),
      item.reorderQuantity || 10
    );

    return {
      suggestedQuantity: Math.max(suggestedQuantity, 1),
      averageDailySales: Math.round(averageDailySales * 100) / 100,
      currentStock: item.stock,
      reorderLevel: item.reorderLevel,
      daysUntilStockout,
      calculations: {
        totalSold90Days,
        annualDemand: Math.round(annualDemand),
        safetyStock: Math.ceil(safetyStock),
        leadTimeDays: item.leadTimeDays,
        reviewPeriod
      }
    };
  } catch (error) {
    console.error('Error calculating reorder quantity:', error);
    throw error;
  }
};

/**
 * Calculate priority score for reorder items
 * @param {Object} item - Inventory item
 * @param {Object} analytics - Analytics from calculateReorderQuantity
 * @returns {Number} Priority score (higher = more urgent)
 */
const calculatePriority = (item, analytics) => {
  let priority = 0;

  // Out of stock gets highest priority
  if (item.stock <= 0) {
    priority += 100;
  }
  // Critical stock (≤3 days)
  else if (analytics.daysUntilStockout <= 3) {
    priority += 50;
  }
  // Low stock (≤7 days)
  else if (analytics.daysUntilStockout <= 7) {
    priority += 25;
  }

  // High sales volume
  if (analytics.averageDailySales > 5) {
    priority += 30;
  } else if (analytics.averageDailySales > 2) {
    priority += 15;
  }

  // High value items
  const itemValue = item.price * item.stock;
  if (itemValue > 10000) {
    priority += 20;
  } else if (itemValue > 5000) {
    priority += 10;
  }

  // Below reorder level
  if (item.stock <= item.reorderLevel) {
    priority += 15;
  }

  return priority;
};

/**
 * Get urgency level based on priority score
 * @param {Number} priority - Priority score
 * @returns {String} Urgency level
 */
const getUrgencyLevel = (priority) => {
  if (priority >= 100) return 'critical';
  if (priority >= 50) return 'high';
  if (priority >= 25) return 'medium';
  return 'low';
};

module.exports = {
  calculateReorderQuantity,
  calculatePriority,
  getUrgencyLevel
};