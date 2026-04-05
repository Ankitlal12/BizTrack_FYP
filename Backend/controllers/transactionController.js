// ==================== IMPORTS ====================
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const { getNepaliDayRangeInUTC } = require("../utils/dateUtils");

// ==================== HELPERS ====================

const formatDay = (date) =>
  new Date(date).toLocaleDateString("en-US", { weekday: "long" });

// ==================== ENDPOINTS ====================
exports.getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query objects for filtering
    const saleQuery = {};
    const purchaseQuery = {};
    
    // Add filters if provided
    if (req.query.search) {
      saleQuery.$or = [
        { invoiceNumber: { $regex: req.query.search, $options: 'i' } },
        { customerName: { $regex: req.query.search, $options: 'i' } }
      ];
      purchaseQuery.$or = [
        { purchaseNumber: { $regex: req.query.search, $options: 'i' } },
        { supplierName: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.type && req.query.type !== 'all') {
      if (req.query.type === 'sale') {
        purchaseQuery._id = null; // Exclude purchases
      } else if (req.query.type === 'purchase') {
        saleQuery._id = null; // Exclude sales
      }
    }
    
    // Date range filtering
    if (req.query.dateFrom || req.query.dateTo) {
      const dateFilter = {};
      if (req.query.dateFrom) {
        const fromRange = getNepaliDayRangeInUTC(req.query.dateFrom);
        dateFilter.$gte = fromRange ? fromRange.start : new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        const toRange = getNepaliDayRangeInUTC(req.query.dateTo);
        dateFilter.$lte = toRange ? toRange.end : new Date(req.query.dateTo);
      }
      saleQuery.createdAt = dateFilter;
      purchaseQuery.createdAt = dateFilter;
    }
    
    // Amount range filtering
    if (req.query.totalMin || req.query.totalMax) {
      const amountFilter = {};
      if (req.query.totalMin) {
        amountFilter.$gte = parseFloat(req.query.totalMin);
      }
      if (req.query.totalMax) {
        amountFilter.$lte = parseFloat(req.query.totalMax);
      }
      saleQuery.total = amountFilter;
      purchaseQuery.total = amountFilter;
    }

    // Build sort object
    let sortObj = { createdAt: 1 }; // default sort - ascending (oldest first)
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      sortObj = { [req.query.sortBy]: sortOrder };
    }

    // Get data from both collections
    const [sales, purchases] = await Promise.all([
      saleQuery._id === null ? [] : Sale.find(saleQuery).sort(sortObj),
      purchaseQuery._id === null ? [] : Purchase.find(purchaseQuery).sort(sortObj),
    ]);

    const saleTransactions = sales.map((sale) => {
      const saleObj = sale.toObject();
      return {
        id: saleObj.invoiceNumber,
        dbId: saleObj._id,
        type: "sale",
        counterpartName: saleObj.customerName,
        total: saleObj.total,
        paidAmount: saleObj.paidAmount || 0,
        scheduledAmount: saleObj.scheduledAmount || 0,
        paymentStatus: saleObj.paymentStatus || 'unpaid',
        payments: (saleObj.payments || []).map(p => ({
          amount: p.amount,
          date: p.date,
          method: p.method,
          notes: p.notes || '',
          status: p.status || 'completed',
        })),
        date: saleObj.createdAt,
        day: formatDay(saleObj.createdAt),
        reference: saleObj.invoiceNumber,
        items: (saleObj.items || []).map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        itemSummary:
          saleObj.items?.[0]?.name &&
          `${saleObj.items[0].name}${
            saleObj.items.length > 1 ? ` (+${saleObj.items.length - 1} more)` : ""
          }`,
      };
    });

    const purchaseTransactions = purchases.map((purchase) => {
      const purchaseObj = purchase.toObject();
      return {
        id: purchaseObj.purchaseNumber,
        dbId: purchaseObj._id,
        type: "purchase",
        counterpartName: purchaseObj.supplierName,
        total: purchaseObj.total,
        paidAmount: purchaseObj.paidAmount || 0,
        scheduledAmount: purchaseObj.scheduledAmount || 0,
        paymentStatus: purchaseObj.paymentStatus || 'unpaid',
        payments: (purchaseObj.payments || []).map(p => ({
          amount: p.amount,
          date: p.date,
          method: p.method,
          notes: p.notes || '',
          status: p.status || 'completed',
        })),
        date: purchaseObj.createdAt,
        day: formatDay(purchaseObj.createdAt),
        reference: purchaseObj.purchaseNumber,
        items: (purchaseObj.items || []).map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.cost,
          total: item.total,
        })),
        itemSummary:
          purchaseObj.items?.[0]?.name &&
          `${purchaseObj.items[0].name}${
            purchaseObj.items.length > 1 ? ` (+${purchaseObj.items.length - 1} more)` : ""
          }`,
      };
    });

    // Combine and sort all transactions
    const allTransactions = [...saleTransactions, ...purchaseTransactions];
    
    // Apply sorting based on query parameters
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    allTransactions.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'date':
        case 'createdAt':
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case 'total':
          aVal = a.total || 0;
          bVal = b.total || 0;
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        case 'reference':
          aVal = a.reference || '';
          bVal = b.reference || '';
          break;
        case 'counterpartName':
          aVal = a.counterpartName || '';
          bVal = b.counterpartName || '';
          break;
        default:
          aVal = new Date(a.date);
          bVal = new Date(b.date);
      }
      
      // Handle string comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder * aVal.localeCompare(bVal);
      }
      
      // Handle date comparison
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortOrder * (aVal.getTime() - bVal.getTime());
      }
      
      // Handle numeric comparison
      return sortOrder * (aVal - bVal);
    });

    // Apply pagination to combined results
    const total = allTransactions.length;
    const pages = Math.ceil(total / limit);
    const paginatedTransactions = allTransactions.slice(skip, skip + limit);

    res.json({
      transactions: paginatedTransactions,
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

