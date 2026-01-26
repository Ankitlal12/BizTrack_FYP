const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");

const formatDay = (date) =>
  new Date(date).toLocaleDateString("en-US", { weekday: "long" });

// Return unified list of sales and purchases for transaction history
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
        dateFilter.$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        dateFilter.$lte = new Date(req.query.dateTo);
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
    let sortObj = { createdAt: -1 }; // default sort
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      sortObj = { [req.query.sortBy]: sortOrder };
    }

    // Get data from both collections
    const [sales, purchases] = await Promise.all([
      saleQuery._id === null ? [] : Sale.find(saleQuery).sort(sortObj),
      purchaseQuery._id === null ? [] : Purchase.find(purchaseQuery).sort(sortObj),
    ]);

    const saleTransactions = sales.map((sale) => ({
      id: sale.invoiceNumber,
      dbId: sale._id,
      type: "sale",
      counterpartName: sale.customerName,
      total: sale.total,
      date: sale.createdAt,
      day: formatDay(sale.createdAt),
      reference: sale.invoiceNumber,
      items: sale.items?.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })) || [],
      itemSummary:
        sale.items?.[0]?.name &&
        `${sale.items[0].name}${
          sale.items.length > 1 ? ` (+${sale.items.length - 1} more)` : ""
        }`,
    }));

    const purchaseTransactions = purchases.map((purchase) => ({
      id: purchase.purchaseNumber,
      dbId: purchase._id,
      type: "purchase",
      counterpartName: purchase.supplierName,
      total: purchase.total,
      date: purchase.createdAt,
      day: formatDay(purchase.createdAt),
      reference: purchase.purchaseNumber,
      items: purchase.items?.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.cost,
        total: item.total,
      })) || [],
      itemSummary:
        purchase.items?.[0]?.name &&
        `${purchase.items[0].name}${
          purchase.items.length > 1 ? ` (+${purchase.items.length - 1} more)` : ""
        }`,
    }));

    // Combine and sort all transactions
    const allTransactions = [...saleTransactions, ...purchaseTransactions].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

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

