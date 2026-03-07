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

/**
 * Get customer retention analytics
 */
exports.getCustomerRetentionAnalytics = async (req, res) => {
  try {
    const { timeRange = 'month' } = req.query;
    
    // Calculate date ranges
    const now = new Date();
    let startDate, endDate;
    let previousStartDate, previousEndDate;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEndDate = startDate;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        endDate = now;
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
        previousEndDate = startDate;
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        endDate = now;
        previousStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousEndDate = startDate;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        endDate = now;
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
        previousEndDate = startDate;
    }

    // Get all sales data
    const allSales = await Sale.find({}).sort({ createdAt: 1 });
    const currentPeriodSales = allSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startDate && saleDate <= endDate;
    });
    
    const previousPeriodSales = allSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= previousStartDate && saleDate < previousEndDate;
    });

    // Get all customers
    const allCustomers = await Customer.find({ isActive: true });

    // Calculate customer metrics
    const customerMetrics = {};
    
    // Track customer purchase patterns
    allSales.forEach(sale => {
      const customerKey = sale.customerPhone || sale.customerEmail || sale.customerName;
      const saleDate = new Date(sale.createdAt);
      
      if (!customerMetrics[customerKey]) {
        customerMetrics[customerKey] = {
          customerName: sale.customerName,
          firstPurchaseDate: saleDate,
          lastPurchaseDate: saleDate,
          totalPurchases: 0,
          totalSpent: 0,
          purchases: []
        };
      }
      
      customerMetrics[customerKey].totalPurchases++;
      customerMetrics[customerKey].totalSpent += sale.total || 0;
      customerMetrics[customerKey].purchases.push({
        date: saleDate,
        amount: sale.total || 0
      });
      
      if (saleDate < customerMetrics[customerKey].firstPurchaseDate) {
        customerMetrics[customerKey].firstPurchaseDate = saleDate;
      }
      if (saleDate > customerMetrics[customerKey].lastPurchaseDate) {
        customerMetrics[customerKey].lastPurchaseDate = saleDate;
      }
    });

    // Calculate retention metrics
    const currentCustomers = new Set();
    const previousCustomers = new Set();
    
    currentPeriodSales.forEach(sale => {
      const customerKey = sale.customerPhone || sale.customerEmail || sale.customerName;
      currentCustomers.add(customerKey);
    });
    
    previousPeriodSales.forEach(sale => {
      const customerKey = sale.customerPhone || sale.customerEmail || sale.customerName;
      previousCustomers.add(customerKey);
    });

    // Calculate metrics
    const totalCustomers = Object.keys(customerMetrics).length;
    const currentPeriodCustomerCount = currentCustomers.size;
    const previousPeriodCustomerCount = previousCustomers.size;
    
    // Returning customers (purchased in both periods)
    const returningCustomers = [...currentCustomers].filter(customer => 
      previousCustomers.has(customer)
    );
    
    // New customers (purchased in current period but not previous)
    const newCustomers = [...currentCustomers].filter(customer => 
      !previousCustomers.has(customer)
    );
    
    const retentionRate = previousPeriodCustomerCount > 0 
      ? (returningCustomers.length / previousPeriodCustomerCount) * 100 
      : 0;
    
    // Repeat customers (more than 1 purchase total)
    const repeatCustomers = Object.values(customerMetrics).filter(customer => 
      customer.totalPurchases > 1
    );
    
    const repeatCustomerRate = totalCustomers > 0 
      ? (repeatCustomers.length / totalCustomers) * 100 
      : 0;

    // Customer Lifetime Value (Average)
    const avgCustomerLifetimeValue = totalCustomers > 0
      ? Object.values(customerMetrics).reduce((sum, customer) => sum + customer.totalSpent, 0) / totalCustomers
      : 0;

    // Average days between purchases for repeat customers
    const avgDaysBetweenPurchases = repeatCustomers.reduce((total, customer) => {
      if (customer.purchases.length < 2) return total;
      
      let totalDays = 0;
      let intervals = 0;
      
      for (let i = 1; i < customer.purchases.length; i++) {
        const daysDiff = (customer.purchases[i].date - customer.purchases[i-1].date) / (1000 * 60 * 60 * 24);
        totalDays += daysDiff;
        intervals++;
      }
      
      return total + (intervals > 0 ? totalDays / intervals : 0);
    }, 0) / (repeatCustomers.length || 1);

    // Customer segmentation
    const highValueCustomers = Object.values(customerMetrics).filter(customer => 
      customer.totalSpent > avgCustomerLifetimeValue * 1.5
    );
    
    const recentCustomers = Object.values(customerMetrics).filter(customer => {
      const daysSinceLastPurchase = (now - customer.lastPurchaseDate) / (1000 * 60 * 60 * 24);
      return daysSinceLastPurchase <= 30;
    });
    
    const atRiskCustomers = Object.values(customerMetrics).filter(customer => {
      const daysSinceLastPurchase = (now - customer.lastPurchaseDate) / (1000 * 60 * 60 * 24);
      return daysSinceLastPurchase > 60 && customer.totalPurchases > 1;
    });

    // Monthly cohort analysis (simplified)
    const cohorts = {};
    Object.values(customerMetrics).forEach(customer => {
      const cohortMonth = customer.firstPurchaseDate.toISOString().slice(0, 7); // YYYY-MM
      if (!cohorts[cohortMonth]) {
        cohorts[cohortMonth] = {
          totalCustomers: 0,
          returningInMonth1: 0,
          returningInMonth2: 0,
          returningInMonth3: 0
        };
      }
      cohorts[cohortMonth].totalCustomers++;
      
      // Check if customer made purchases in subsequent months
      const cohortDate = new Date(customer.firstPurchaseDate);
      customer.purchases.forEach(purchase => {
        const monthsDiff = (new Date(purchase.date).getFullYear() - cohortDate.getFullYear()) * 12 + 
                          (new Date(purchase.date).getMonth() - cohortDate.getMonth());
        
        if (monthsDiff === 1) cohorts[cohortMonth].returningInMonth1++;
        if (monthsDiff === 2) cohorts[cohortMonth].returningInMonth2++;
        if (monthsDiff === 3) cohorts[cohortMonth].returningInMonth3++;
      });
    });

    const retentionAnalytics = {
      overview: {
        totalCustomers,
        currentPeriodCustomers: currentPeriodCustomerCount,
        previousPeriodCustomers: previousPeriodCustomerCount,
        newCustomers: newCustomers.length,
        returningCustomers: returningCustomers.length,
        retentionRate: Math.round(retentionRate * 100) / 100,
        repeatCustomerRate: Math.round(repeatCustomerRate * 100) / 100,
        avgCustomerLifetimeValue: Math.round(avgCustomerLifetimeValue * 100) / 100,
        avgDaysBetweenPurchases: Math.round(avgDaysBetweenPurchases * 100) / 100
      },
      segmentation: {
        highValueCustomers: highValueCustomers.length,
        recentCustomers: recentCustomers.length,
        atRiskCustomers: atRiskCustomers.length,
        oneTimeBuyers: totalCustomers - repeatCustomers.length
      },
      cohorts: Object.entries(cohorts).map(([month, data]) => ({
        cohortMonth: month,
        ...data,
        retentionRate1: data.totalCustomers > 0 ? Math.round((data.returningInMonth1 / data.totalCustomers) * 10000) / 100 : 0,
        retentionRate2: data.totalCustomers > 0 ? Math.round((data.returningInMonth2 / data.totalCustomers) * 10000) / 100 : 0,
        retentionRate3: data.totalCustomers > 0 ? Math.round((data.returningInMonth3 / data.totalCustomers) * 10000) / 100 : 0
      })).sort((a, b) => b.cohortMonth.localeCompare(a.cohortMonth)).slice(0, 6),
      topCustomers: Object.values(customerMetrics)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)
        .map(customer => ({
          name: customer.customerName,
          totalSpent: Math.round(customer.totalSpent * 100) / 100,
          totalPurchases: customer.totalPurchases,
          firstPurchase: customer.firstPurchaseDate.toISOString().split('T')[0],
          lastPurchase: customer.lastPurchaseDate.toISOString().split('T')[0],
          daysSinceLastPurchase: Math.floor((now - customer.lastPurchaseDate) / (1000 * 60 * 60 * 24))
        }))
    };

    res.json({
      success: true,
      data: retentionAnalytics,
      timeRange,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Error calculating customer retention analytics:', error);
    res.status(500).json({ 
      error: 'Failed to calculate customer retention analytics',
      details: error.message 
    });
  }
};
