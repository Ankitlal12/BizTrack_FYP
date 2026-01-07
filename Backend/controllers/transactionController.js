const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");

const formatDay = (date) =>
  new Date(date).toLocaleDateString("en-US", { weekday: "long" });

// Return unified list of sales and purchases for transaction history
exports.getTransactions = async (req, res) => {
  try {
    const [sales, purchases] = await Promise.all([
      Sale.find().sort({ createdAt: -1 }),
      Purchase.find().sort({ createdAt: -1 }),
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

    const transactions = [...saleTransactions, ...purchaseTransactions].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

