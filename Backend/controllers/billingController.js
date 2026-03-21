const Customer = require("../models/Customer");
const Inventory = require("../models/Inventory");
const Sale = require("../models/Sale");
const Notification = require("../models/Notification");
const { getNepaliCurrentDateTime } = require("../utils/dateUtils");
const { generateInvoiceFromSale } = require("./invoiceController");
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

// ==================== CUSTOMER ENDPOINTS ====================

// Get all customers with optional search
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

// Get single customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new customer
exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, city, state, zipCode, notes } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        error: "Name and phone are required fields",
      });
    }

    // Check if customer with same phone already exists
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({
        error: "Customer with this phone number already exists",
      });
    }

    const customer = await Customer.create({
      name,
      email: email || undefined,
      phone,
      address,
      city,
      state,
      zipCode,
      notes,
    });

    res.status(201).json(customer);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Check if customer has any sales
    const salesCount = await Sale.countDocuments({
      $or: [
        { customerEmail: customer.email },
        { customerPhone: customer.phone },
      ],
    });

    if (salesCount > 0) {
      return res.status(400).json({
        error: `Cannot delete customer. They have ${salesCount} associated sale(s).`,
      });
    }

    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== PRODUCT ENDPOINTS FOR BILLING ====================

// Get all products for billing (from inventory)
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

    const products = await Inventory.find(query)
      .select("name sku price category stock")
      .sort({ name: 1 });

    // Transform to billing format
    const billingProducts = products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      barcode: product.sku || "",
      price: product.price,
      category: product.category || "Uncategorized",
      stock: product.stock || 0,
    }));

    res.json(billingProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single product by ID for billing
exports.getBillingProductById = async (req, res) => {
  try {
    const product = await Inventory.findById(req.params.id).select(
      "name sku price category stock"
    );
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const billingProduct = {
      id: product._id.toString(),
      name: product.name,
      barcode: product.sku || "",
      price: product.price,
      category: product.category || "Uncategorized",
      stock: product.stock || 0,
    };

    res.json(billingProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== BILLING/SALE ENDPOINTS ====================

// Create a new sale/bill
exports.createBill = async (req, res) => {
  try {
    const {
      customerId,
      customer,
      items,
      subtotal,
      tax,
      discount,
      total,
      paymentMethod,
      paidAmount,
      notes,
      khaltiPayment, // New field for Khalti payment
      esewaPayment,
    } = req.body;

    if (khaltiPayment?.pidx) {
      const existingKhaltiSale = await Sale.findOne({ "khaltiPayment.pidx": khaltiPayment.pidx })
        .populate("items.inventoryId");
      if (existingKhaltiSale) {
        return res.status(200).json(existingKhaltiSale);
      }
    }

    if (esewaPayment?.transactionUuid) {
      const existingEsewaSale = await Sale.findOne({ "esewaPayment.transactionUuid": esewaPayment.transactionUuid })
        .populate("items.inventoryId");
      if (existingEsewaSale) {
        return res.status(200).json(existingEsewaSale);
      }
    }

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Items are required" });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ error: "Total must be greater than 0" });
    }

    // Get customer information
    let customerInfo = {};
    if (customerId) {
      const customerDoc = await Customer.findById(customerId);
      if (!customerDoc) {
        return res.status(404).json({ error: "Customer not found" });
      }
      customerInfo = {
        customerName: customerDoc.name,
        customerEmail: customerDoc.email,
        customerPhone: customerDoc.phone,
      };
    } else if (customer) {
      customerInfo = {
        customerName: customer.name,
        customerEmail: customer.email || "",
        customerPhone: customer.phone || "",
      };
    } else {
      return res.status(400).json({ error: "Customer information is required" });
    }

    // Validate stock availability and prepare items
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
        stockErrors.push(
          `Insufficient stock for ${item.name || inventoryItem.name}. Available: ${inventoryItem.stock}, Requested: ${item.quantity}`
        );
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

    if (stockErrors.length > 0) {
      return res.status(400).json({
        error: "Insufficient stock",
        details: stockErrors,
      });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    // Calculate payment status based on paid amount
    const actualPaidAmount = paidAmount || 0;
    
    // Validate payment amount doesn't exceed total
    if (actualPaidAmount > total) {
      return res.status(400).json({
        error: `Payment amount (Rs ${actualPaidAmount.toFixed(2)}) cannot exceed total amount (Rs ${total.toFixed(2)})`
      });
    }
    
    let paymentStatus = 'unpaid';
    if (actualPaidAmount >= total) {
      paymentStatus = 'paid';
    } else if (actualPaidAmount > 0) {
      paymentStatus = 'partial';
    }

    // Create sale
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
      // Add user tracking information
      createdBy: {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || "Unknown User",
        role: req.user?.role || "staff",
      },
    };

    // Add Khalti payment information if provided
    if (khaltiPayment) {
      saleData.khaltiPayment = {
        pidx: khaltiPayment.pidx,
        transactionId: khaltiPayment.transactionId,
        status: khaltiPayment.status,
      };
    }

    if (esewaPayment) {
      saleData.esewaPayment = {
        transactionUuid: esewaPayment.transactionUuid,
        refId: esewaPayment.refId,
        status: esewaPayment.status,
        totalAmount: esewaPayment.totalAmount,
      };
    }

    // If there's a payment, add it to the payments array
    if (actualPaidAmount > 0) {
      saleData.payments = [{
        amount: actualPaidAmount,
        date: getNepaliCurrentDateTime(),
        method: paymentMethod || "cash",
        notes: notes || "",
      }];
    }

    const sale = await Sale.create(saleData);

    // Update inventory stock for each item atomically
    // Using findOneAndUpdate with condition to prevent negative stock
    for (const item of saleItems) {
      const updatedInventory = await Inventory.findOneAndUpdate(
        {
          _id: item.inventoryId,
          stock: { $gte: item.quantity }, // Only update if stock is sufficient
        },
        {
          $inc: { stock: -item.quantity },
          lastUpdated: new Date(),
        },
        { new: true }
      );

      // If update failed (stock was insufficient), rollback the sale
      if (!updatedInventory) {
        // Delete the sale that was just created
        await Sale.findByIdAndDelete(sale._id);
        return res.status(400).json({
          error: "Insufficient stock",
          details: `Stock changed for ${item.name}. Please refresh and try again.`,
        });
      }

      // Check for low stock after update
      await checkAndCreateStockNotification(updatedInventory);
    }

    // Create notification for new sale
    try {
      const totalItems = saleItems.reduce((sum, item) => sum + item.quantity, 0);
      await createNotification({
        type: "sale",
        title: "New Sale Completed",
        message: `Sale ${sale.invoiceNumber} has been completed with ${totalItems} item(s) for ${customerInfo.customerName || 'customer'}. Total: Rs ${sale.total.toFixed(2)}.`,
        relatedId: sale._id,
        relatedModel: "Sale",
        metadata: {
          invoiceNumber: sale.invoiceNumber,
          customerName: customerInfo.customerName,
          totalItems: totalItems,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
        },
      });
    } catch (notifError) {
      // Don't fail the sale creation if notification fails
      console.error("Failed to create notification:", notifError);
    }

    // Generate invoice from sale automatically
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

    // Populate and return the sale
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

      if (existingSale) {
        return res.status(200).json(existingSale);
      }
    }

    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};

// Get all bills/sales (for billing page history if needed)
exports.getAllBills = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const sales = await Sale.find()
      .populate("items.inventoryId")
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single bill by ID
exports.getBillById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate("items.inventoryId");
    if (!sale) {
      return res.status(404).json({ error: "Bill not found" });
    }
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// ==================== KHALTI PAYMENT ENDPOINTS ====================

const { initiateKhaltiPayment, verifyKhaltiPayment } = require("../utils/khaltiService");
const {
  buildEsewaPaymentParams,
  verifyEsewaPayment: verifyEsewaPaymentStatus,
  verifyResponseSignature,
} = require("../utils/esewaService");

// Initiate Khalti payment for a bill
exports.initiateKhaltiPayment = async (req, res) => {
  try {
    const {
      customerId,
      customer,
      items,
      total,
      invoiceNumber,
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Items are required" });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ error: "Total must be greater than 0" });
    }

    // Get customer information
    let customerInfo = {};
    if (customerId) {
      const customerDoc = await Customer.findById(customerId);
      if (!customerDoc) {
        return res.status(404).json({ error: "Customer not found" });
      }
      customerInfo = {
        name: customerDoc.name,
        email: customerDoc.email || '',
        phone: customerDoc.phone,
      };
    } else if (customer) {
      customerInfo = {
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
      };
    } else {
      return res.status(400).json({ error: "Customer information is required" });
    }

    // Validate customer phone
    if (!customerInfo.phone) {
      return res.status(400).json({ error: "Customer phone number is required for Khalti payment" });
    }

    // Generate purchase order ID (use invoice number or generate new one)
    const purchaseOrderId = invoiceNumber || `ORD-${Date.now().toString().slice(-8)}`;

    // Prepare product details for Khalti
    const productDetails = items.map(item => ({
      id: item.id,
      name: item.name,
      total_price: item.total || (item.quantity * item.price),
      quantity: item.quantity,
      unit_price: item.price,
    }));

    // Initiate Khalti payment
    const paymentData = {
      amount: total,
      purchaseOrderId,
      purchaseOrderName: `BizTrack Invoice ${purchaseOrderId}`,
      customerInfo,
      productDetails,
    };

    const khaltiResponse = await initiateKhaltiPayment(paymentData);

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
    res.status(500).json({ 
      error: err.message || "Failed to initiate Khalti payment" 
    });
  }
};

// Verify Khalti payment and complete the sale
exports.verifyKhaltiPayment = async (req, res) => {
  try {
    const { pidx } = req.body;

    if (!pidx) {
      return res.status(400).json({ error: "Payment identifier (pidx) is required" });
    }

    // Verify payment with Khalti
    const verificationResult = await verifyKhaltiPayment(pidx);

    if (!verificationResult.isCompleted) {
      return res.status(400).json({
        error: verificationResult.message,
        status: verificationResult.status,
        details: verificationResult,
      });
    }

    // Payment is successful
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
    res.status(500).json({ 
      error: err.message || "Failed to verify Khalti payment" 
    });
  }
};

// ==================== ESEWA PAYMENT ENDPOINTS ====================

// Initiate eSewa payment — returns form fields for frontend to POST
exports.initiateEsewaPayment = async (req, res) => {
  try {
    const { customerId, customer, items, total } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ error: "Items are required" });
    if (!total || total <= 0)
      return res.status(400).json({ error: "Total must be greater than 0" });

    // Validate customer exists
    if (customerId) {
      const customerDoc = await Customer.findById(customerId);
      if (!customerDoc) return res.status(404).json({ error: "Customer not found" });
    } else if (!customer) {
      return res.status(400).json({ error: "Customer information is required" });
    }

    const merchantCode = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
    const gatewayUrl = process.env.ESEWA_GATEWAY_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
    const isSandboxMode = merchantCode === 'EPAYTEST' || gatewayUrl.includes('rc-epay.esewa.com.np');
    const sandboxMaxAmount = parseFloat(process.env.ESEWA_SANDBOX_MAX_AMOUNT || '100000');

    if (isSandboxMode && Number(total) > sandboxMaxAmount) {
      return res.status(400).json({
        error: `eSewa test wallet often has low balance. For sandbox, try amount <= Rs ${sandboxMaxAmount.toFixed(2)} or use another test ID (9806800001/2/3/4/5).`,
      });
    }

    const transactionUuid = `BT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const params = buildEsewaPaymentParams({ amount: total, transactionUuid, productName: "BizTrack Sale" });

    res.json({
      success: true,
      gatewayUrl: params.gatewayUrl,
      fields: params.fields,
      transactionUuid,
    });
  } catch (err) {
    console.error("eSewa initiation error:", err);
    res.status(500).json({ error: err.message || "Failed to initiate eSewa payment" });
  }
};

// Verify eSewa payment and complete the sale
exports.verifyEsewaPayment = async (req, res) => {
  try {
    const { encodedResponse } = req.body;

    if (!encodedResponse)
      return res.status(400).json({ error: "Encoded response from eSewa is required" });

    // eSewa callback data can contain spaces where '+' was present in base64
    const normalizedResponse = String(encodedResponse).replace(/ /g, '+');

    // Decode base64 response from eSewa redirect
    const decoded = JSON.parse(Buffer.from(normalizedResponse, 'base64').toString('utf-8'));
    const { total_amount, transaction_uuid, status } = decoded;

    const isSignatureValid = verifyResponseSignature(decoded);
    if (!isSignatureValid) {
      return res.status(400).json({ error: "Invalid eSewa callback signature" });
    }

    if (status !== 'COMPLETE') {
      return res.status(400).json({ error: `Payment not completed. Status: ${status}` });
    }

    // Verify with eSewa status API
    const verification = await verifyEsewaPaymentStatus({ totalAmount: total_amount, transactionUuid: transaction_uuid });

    if (!verification.success) {
      return res.status(400).json({ error: verification.message, status: verification.status });
    }

    res.json({
      success: true,
      message: "eSewa payment verified successfully",
      transactionUuid: verification.transactionUuid,
      totalAmount: verification.totalAmount,
      refId: verification.refId,
      status: verification.status,
    });
  } catch (err) {
    console.error("eSewa verification error:", err);
    res.status(500).json({ error: err.message || "Failed to verify eSewa payment" });
  }
};

// Verify eSewa payment status using transaction UUID + amount (fallback for failure redirects)
exports.verifyEsewaPaymentStatus = async (req, res) => {
  try {
    const { transactionUuid, totalAmount } = req.body;

    if (!transactionUuid || !totalAmount) {
      return res.status(400).json({
        error: "transactionUuid and totalAmount are required",
      });
    }

    const verification = await verifyEsewaPaymentStatus({
      totalAmount,
      transactionUuid,
    });

    if (!verification.success) {
      return res.status(400).json({
        error: verification.message,
        status: verification.status,
      });
    }

    res.json({
      success: true,
      message: "eSewa payment verified successfully",
      transactionUuid: verification.transactionUuid,
      totalAmount: verification.totalAmount,
      refId: verification.refId,
      status: verification.status,
    });
  } catch (err) {
    console.error("eSewa status verification error:", err);
    res.status(500).json({
      error: err.message || "Failed to verify eSewa payment status",
    });
  }
};
