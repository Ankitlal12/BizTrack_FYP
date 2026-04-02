// ==================== IMPORTS ====================
const Sale = require("../models/Sale");
const Inventory = require("../models/Inventory");

// ==================== ANALYTICS CALCULATIONS ====================

/**
 * Calculate reorder quantity and demand analytics for an inventory item
 * based on the last 90 days of sales data.
 * @param {string} inventoryId - MongoDB ObjectId of the inventory item
 * @returns {Promise<Object>} Analytics and suggested reorder quantity
 */
const calculateReorderQuantity = async (inventoryId) => {
  try {
    const item = await Inventory.findById(inventoryId);
    if (!item) throw new Error('Inventory item not found');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Aggregate total units sold in the last 90 days
    const sales = await Sale.find({ 'items.inventoryId': inventoryId, createdAt: { $gte: ninetyDaysAgo } });
    let totalSold90Days = 0;
    sales.forEach(sale => {
      sale.items.forEach(saleItem => {
        if (saleItem.inventoryId.toString() === inventoryId.toString()) {
          totalSold90Days += saleItem.quantity;
        }
      });
    });

    const averageDailySales = totalSold90Days / 90;
    const annualDemand = averageDailySales * 365;
    const safetyStock = item.leadTimeDays * averageDailySales;
    const daysUntilStockout = averageDailySales > 0 ? Math.floor(item.stock / averageDailySales) : 999;

    // Suggested quantity: cover lead time + weekly review period + safety stock, minus current stock
    const reviewPeriod = 7;
    const suggestedQuantity = Math.max(
      Math.ceil((item.leadTimeDays + reviewPeriod) * averageDailySales + safetyStock - item.stock),
      item.reorderQuantity || 50
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
        reviewPeriod,
      },
    };
  } catch (error) {
    console.error('Error calculating reorder quantity:', error);
    throw error;
  }
};

// ==================== PRIORITY & URGENCY ====================

/**
 * Calculate a numeric priority score for a low-stock item.
 * Higher score = more urgent.
 * @param {Object} item - Inventory document
 * @param {Object} analytics - Result from calculateReorderQuantity
 * @returns {number}
 */
const calculatePriority = (item, analytics) => {
  let priority = 0;

  // Stock level scoring
  if (item.stock <= 0) priority += 100;
  else if (analytics.daysUntilStockout <= 3) priority += 50;
  else if (analytics.daysUntilStockout <= 7) priority += 25;

  // Sales velocity scoring
  if (analytics.averageDailySales > 5) priority += 30;
  else if (analytics.averageDailySales > 2) priority += 15;

  // Item value scoring
  const itemValue = item.price * item.stock;
  if (itemValue > 10000) priority += 20;
  else if (itemValue > 5000) priority += 10;

  // Below reorder level
  if (item.stock <= item.reorderLevel) priority += 15;

  return priority;
};

/**
 * Map a priority score to a human-readable urgency level
 * @param {number} priority
 * @returns {'critical'|'high'|'medium'|'low'}
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
  getUrgencyLevel,
};
