const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
const Invoice = require("../models/Invoice");

/**
 * Get all customers with optional filtering
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const customers = await Customer.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add purchase count for each customer
    const customersWithCount = await Promise.all(
      customers.map(async (customer) => {
        const purchaseCount = await Sale.countDocuments({
          $or: [
            { customerPhone: customer.phone },
            { customerEmail: customer.email }
          ]
        });
        
        return {
          ...customer.toObject(),
          purchaseCount
        };
      })
    );

    const total = await Customer.countDocuments(query);

    res.json({
      data: customersWithCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch customers',
      details: error.message 
    });
  }
};

/**
 * Get customer by ID
 */
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ data: customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ 
      error: 'Failed to fetch customer',
      details: error.message 
    });
  }
};

/**
 * Create new customer
 */
exports.createCustomer = async (req, res) => {
  try {
    const customerData = {
      ...req.body
    };

    // Validate required fields
    if (!customerData.name || !customerData.phone) {
      return res.status(400).json({
        error: 'Name and phone are required fields'
      });
    }

    const customer = await Customer.create(customerData);
    
    res.status(201).json({ 
      data: customer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Customer with this information already exists'
      });
    }

    res.status(500).json({ 
      error: 'Failed to create customer',
      details: error.message 
    });
  }
};

/**
 * Update customer
 */
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ 
      data: customer,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ 
      error: 'Failed to update customer',
      details: error.message 
    });
  }
};

/**
 * Delete customer (soft delete - set isActive to false)
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check for pending invoices
    const pendingInvoices = await Invoice.countDocuments({
      customerPhone: customer.phone,
      paymentStatus: { $in: ['unpaid', 'partial'] }
    });

    if (pendingInvoices > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with pending invoices',
        details: `Customer has ${pendingInvoices} pending invoice(s). Please resolve them first.`
      });
    }

    // Soft delete
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { isActive: false },
      { new: true }
    );

    res.json({ 
      data: updatedCustomer,
      message: 'Customer deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ 
      error: 'Failed to delete customer',
      details: error.message 
    });
  }
};

/**
 * Get customer purchase history and payment details
 */
exports.getCustomerPurchaseHistory = async (req, res) => {
  try {
    const customerId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get customer details
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get all sales from this customer
    const sales = await Sale.find({ 
      $or: [
        { customerPhone: customer.phone },
        { customerEmail: customer.email }
      ]
    })
      .populate('items.inventoryId', 'name sku')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalSales = await Sale.countDocuments({ 
      $or: [
        { customerPhone: customer.phone },
        { customerEmail: customer.email }
      ]
    });

    // Calculate financial summary
    const allSales = await Sale.find({ 
      $or: [
        { customerPhone: customer.phone },
        { customerEmail: customer.email }
      ]
    });

    const financialSummary = {
      totalPurchased: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      purchaseCount: allSales.length,
      paidPurchases: 0,
      partialPurchases: 0,
      unpaidPurchases: 0
    };

    allSales.forEach(sale => {
      financialSummary.totalPurchased += sale.total || 0;
      financialSummary.totalPaid += sale.paidAmount || 0;
      
      if (sale.paymentStatus === 'paid') {
        financialSummary.paidPurchases++;
      } else if (sale.paymentStatus === 'partial') {
        financialSummary.partialPurchases++;
      } else {
        financialSummary.unpaidPurchases++;
      }
    });

    financialSummary.totalOutstanding = financialSummary.totalPurchased - financialSummary.totalPaid;

    res.json({
      data: {
        customer,
        sales,
        financialSummary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalSales,
          pages: Math.ceil(totalSales / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching customer purchase history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch customer purchase history',
      details: error.message 
    });
  }
};
