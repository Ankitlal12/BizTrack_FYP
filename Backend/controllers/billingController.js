// ==================== IMPORTS ====================
const Customer = require("../models/Customer");
const Inventory = require("../models/Inventory");
const Sale = require("../models/Sale");
const Notification = require("../models/Notification");
const { getNepaliCurrentDateTime } = require("../utils/dateUtils");
const { generateInvoiceFromSale } = require("./invoiceController");
const { createNotification } = require("../utils/notificationHelper");
const { initiateKhaltiPayment, verifyKhaltiPayment } = require("../utils/khaltiService");

// ==================== HELPERS ====================

// Check stock level and fire low-stock / out-of-stock notifications
const checkAndCreateStockNotification = async (item) => {
  try {
    if (item.stock <= 0) {
      const existingNotif = await Notification.findOne({ type: "out_of_stock", relatedId: item._id, read: false });
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
      const existingNotif = await Notification.findOne({ type: "low_stock", relatedId: item._id, read: false });
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

// Resolve customer info from request body (by ID or inline object)
const resolveCustomerInfo = async (customerId, customer) => {
  if (customerId) {
    const customerDoc = await Customer.findById(customerId);
    if (!customerDoc) throw { status: 404, message: "Customer not found" };
    return { customerName: customerDoc.name, customerEmail: customerDoc.email, customerPhone: customerDoc.phone };
  }
  if (customer) {
    return { customerName: customer.name, customerEmail: customer.email || "", customerPhone: customer.phone || "" };
  }
  throw { status: 400, message: "Customer information is required" };
};

// ==================== CUSTOMER ENDPOINTS ====================

exports.getAllCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      };
    }
    const customers = await Customer.find(query).sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, city, state, zipCode, notes } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "Name and phone are required fields" });
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) return res.status(400).json({ error: "Customer with this phone number already exists" });
    const customer = await Customer.create({ name, email: email || undefined, phone, address, city, state, zipCode, notes });
    res.status(201).json(customer);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    const salesCount = await Sale.countDocuments({
      $or: [{ customerEmail: customer.email }, { customerPhone: customer.phone }],
    });
    if (salesCount > 0) {
      return res.status(400).json({ error: `Cannot delete customer. They have ${salesCount} associated sale(s).` });
    }
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== PRODUCT ENDPOINTS FOR BILLING ====================

exports.getBillingProducts = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
        ],
      };
    }
    const products = await Inventory.find(query).select("name sku price category stock").sort({ name: 1 });
    const billingProducts = products.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      barcode: p.sku || "",
      price: p.price,
      category: p.category || "Uncategorized",
      stock: p.stock || 0,
    }));
    res.json(billingProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBillingProductById = async (req, res) => {
  try {
    const product = await Inventory.findById(req.params.id).select("name sku price category stock");
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({
      id: product._id.toString(),
      name: product.name,
      barcode: product.sku || "",
      price: product.price,
      category: product.category || "Uncategorized",
      stock: product.stock || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== BILLING / SALE ENDPOINTS ====================

exports.createBill = async (req, res) => {
  try {
    const { customerId, customer, items, subtotal, tax, discount, total, paymentMethod, paidAmount, notes, khaltiPayment, esewaPayment } = req.body;

    // Idempotency: return existing sale if duplicate payment token
    if (khaltiPayment?.pidx) {
      const existing = await Sale.findOne({ "khaltiPayment.pidx": khaltiPayment.pidx }).populate("items.inventoryId");
      if (existing) return res.status(200).json(existing);
    }
    if (esewaPayment?.transactionUuid) {
      const existing = await Sale.findOne({ "esewaPayment.transactionUuid": esewaPayment.transactionUuid }).populate("items.inventoryId");
      if (existing) return res.status(200).json(existing);
    }

    if (!items || items.length === 0) return res.status(400).json({ error: "Items are required" });
    if (!total || total <= 0) return res.status(400).json({ error: "Total must be greater than 0" });

    let customerInfo;
    try {
      customerInfo = await resolveCustomerInfo(customerId, customer);
    } catch (e) {
      return res.status(e.status).json({ error: e.message });
    }

    // Validate stock and build sale items
    const stockErrors = [];
    const saleItems = [];
    for (const item of items) {
      if (!item.id || !item.quantity || !item.price) {
        stockErrors.push(`Invalid item data: ${item.name || "Unknown"}`);
        continue;
      }
      const inventoryItem = await Inventory.findById(item.id);
      if (!inventoryItem) {
        stockErrors.push(`Product ${item.name || item.id} not found in inventory`);
        continue;
      }
      if (inventoryItem.stock < item.quantity) {
        stockErrors.push(`Insufficient stock for ${item.name || inventoryItem.name}. Available: ${inventoryItem.stock}, Requested: ${item.quantity}`);
        continue;
      }
      saleItems.push({
        inventoryId: inventoryItem._id,
        name: item.name || inventoryItem.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total || item.quantity * item.price,
      });
    }
    if (stockErrors.length > 0) return res.status(400).json({ error: "Insufficient stock", details: stockErrors });

    // Determine payment status
    const actualPaidAmount = paidAmount || 0;
    if (actualPaidAmount > total) {
      return res.status(400).json({ error: `Payment amount (Rs ${actualPaidAmount.toFixed(2)}) cannot exceed total amount (Rs ${total.toFixed(2)})` });
    }
    let paymentStatus = 'unpaid';
    if (actualPaidAmount >= total) paymentStatus = 'paid';
    else if (actualPaidAmount > 0) paymentStatus = 'partial';

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const saleData = {
      invoiceNumber,
      ...customerInfo,
      items: saleItems,
      subtotal: subtotal || 0,
      tax: tax || 0,
      discount: discount || 0,
      total,
      paymentMethod: paymentMethod || "cash",
      paymentStatus,
      paidAmount: actualPaidAmount,
      status: "completed",
      notes: notes || "",
      createdBy: { userId: req.user?.id || req.user?._id, name: req.user?.name || "Unknown User", role: req.user?.role || "staff" },
    };

    if (khaltiPayment) saleData.khaltiPayment = { pidx: khaltiPayment.pidx, transactionId: khaltiPayment.transactionId, status: khaltiPayment.status };
    if (esewaPayment) saleData.esewaPayment = { transactionUuid: esewaPayment.transactionUuid, refId: esewaPayment.refId, status: esewaPayment.status, totalAmount: esewaPayment.totalAmount };
    if (actualPaidAmount > 0) {
      saleData.payments = [{ amount: actualPaidAmount, date: getNepaliCurrentDateTime(), method: paymentMethod || "cash", notes: notes || "" }];
    }

    const sale = await Sale.create(saleData);

    // Deduct inventory stock atomically
    for (const item of saleItems) {
      const updatedInventory = await Inventory.findOneAndUpdate(
        { _id: item.inventoryId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity }, lastUpdated: new Date() },
        { new: true }
      );
      if (!updatedInventory) {
        await Sale.findByIdAndDelete(sale._id);
        return res.status(400).json({ error: "Insufficient stock", details: `Stock changed for ${item.name}. Please refresh and try again.` });
      }
      await checkAndCreateStockNotification(updatedInventory);
    }

    // Create sale notification
    try {
      const totalItems = saleItems.reduce((sum, item) => sum + item.quantity, 0);
      await createNotification({
        type: "sale",
        title: "New Sale Completed",
        message: `Sale ${sale.invoiceNumber} has been completed with ${totalItems} item(s) for ${customerInfo.customerName || 'customer'}. Total: Rs ${sale.total.toFixed(2)}.`,
        relatedId: sale._id,
        relatedModel: "Sale",
        metadata: { invoiceNumber: sale.invoiceNumber, customerName: customerInfo.customerName, totalItems, total: sale.total, paymentMethod: sale.paymentMethod },
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }

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

    const populatedSale = await Sale.findById(sale._id).populate("items.inventoryId");
    res.status(201).json(populatedSale);
  } catch (err) {
    if (err?.code === 11000) {
      const existingSale =
        (req.body?.esewaPayment?.transactionUuid
          ? await Sale.findOne({ "esewaPayment.transactionUuid": req.body.esewaPayment.transactionUuid }).populate("items.inventoryId")
          : null) ||
        (req.body?.khaltiPayment?.pidx
          ? await Sale.findOne({ "khaltiPayment.pidx": req.body.khaltiPayment.pidx }).populate("items.inventoryId")
          : null);
      if (existingSale) return res.status(200).json(existingSale);
    }
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

exports.getAllBills = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const sales = await Sale.find().populate("items.inventoryId").sort({ createdAt: 1 }).limit(parseInt(limit)).skip(parseInt(skip));
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate("items.inventoryId");
    if (!sale) return res.status(404).json({ error: "Bill not found" });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== KHALTI PAYMENT ENDPOINTS ====================

exports.initiateKhaltiPayment = async (req, res) => {
  try {
    const { customerId, customer, items, total, invoiceNumber } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ error: "Items are required" });
    if (!total || total <= 0) return res.status(400).json({ error: "Total must be greater than 0" });

    let customerInfo;
    try {
      customerInfo = await resolveCustomerInfo(customerId, customer);
    } catch (e) {
      return res.status(e.status).json({ error: e.message });
    }

    if (!customerInfo.customerPhone) {
      return res.status(400).json({ error: "Customer phone number is required for Khalti payment" });
    }

    const purchaseOrderId = invoiceNumber || `ORD-${Date.now().toString().slice(-8)}`;
    const khaltiResponse = await initiateKhaltiPayment({
      amount: total,
      purchaseOrderId,
      purchaseOrderName: `BizTrack Invoice ${purchaseOrderId}`,
      customerInfo: { name: customerInfo.customerName, email: customerInfo.customerEmail, phone: customerInfo.customerPhone },
      productDetails: items.map(item => ({
        id: item.id,
        name: item.name,
        total_price: item.total || (item.quantity * item.price),
        quantity: item.quantity,
        unit_price: item.price,
      })),
    });

    res.json({
      success: true,
      pidx: khaltiResponse.pidx,
      payment_url: khaltiResponse.payment_url,
      expires_at: khaltiResponse.expires_at,
      expires_in: khaltiResponse.expires_in,
      purchaseOrderId,
    });
  } catch (err) {
    console.error("Khalti payment initiation error:", err);
    res.status(500).json({ error: err.message || "Failed to initiate Khalti payment" });
  }
};

exports.verifyKhaltiPayment = async (req, res) => {
  try {
    const { pidx } = req.body;
    if (!pidx) return res.status(400).json({ error: "Payment identifier (pidx) is required" });

    const verificationResult = await verifyKhaltiPayment(pidx);
    if (!verificationResult.isCompleted) {
      return res.status(400).json({ error: verificationResult.message, status: verificationResult.status, details: verificationResult });
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
    console.error("Khalti payment verification error:", err);
    res.status(500).json({ error: err.message || "Failed to verify Khalti payment" });
  }
};
