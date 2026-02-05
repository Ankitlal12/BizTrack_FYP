const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");
const Purchase = require("../models/Purchase");
const Reorder = require("../models/Reorder");

/**
 * Get all suppliers with optional filtering
 */
exports.getAllSuppliers = async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const suppliers = await Supplier.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Supplier.countDocuments(query);

    res.json({
      data: suppliers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch suppliers',
      details: error.message 
    });
  }
};

/**
 * Get supplier by ID
 */
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('products.inventoryId', 'name sku category');

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ data: supplier });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ 
      error: 'Failed to fetch supplier',
      details: error.message 
    });
  }
};

/**
 * Create new supplier
 */
exports.createSupplier = async (req, res) => {
  try {
    const supplierData = {
      ...req.body,
      products: req.body.products || []
    };

    const supplier = await Supplier.create(supplierData);
    
    res.status(201).json({ 
      data: supplier,
      message: 'Supplier created successfully'
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Supplier with this information already exists'
      });
    }

    res.status(500).json({ 
      error: 'Failed to create supplier',
      details: error.message 
    });
  }
};

/**
 * Update supplier
 */
exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ 
      data: supplier,
      message: 'Supplier updated successfully'
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ 
      error: 'Failed to update supplier',
      details: error.message 
    });
  }
};

/**
 * Delete supplier (soft delete - set isActive to false)
 */
exports.deleteSupplier = async (req, res) => {
  try {
    const supplierId = req.params.id;

    // Check for active reorders
    const activeReorders = await Reorder.countDocuments({
      supplierId,
      status: { $in: ['pending', 'approved', 'ordered'] }
    });

    if (activeReorders > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete supplier with active reorders',
        details: `Supplier has ${activeReorders} active reorder(s). Please resolve them first.`
      });
    }

    // Check for pending purchases
    const pendingPurchases = await Purchase.countDocuments({
      supplierName: { $regex: req.params.id, $options: 'i' },
      status: { $in: ['pending', 'ordered'] }
    });

    if (pendingPurchases > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete supplier with pending purchases',
        details: `Supplier has ${pendingPurchases} pending purchase(s). Please resolve them first.`
      });
    }

    // Soft delete
    const supplier = await Supplier.findByIdAndUpdate(
      supplierId,
      { isActive: false },
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ 
      data: supplier,
      message: 'Supplier deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ 
      error: 'Failed to delete supplier',
      details: error.message 
    });
  }
};

/**
 * Get products linked to supplier
 */
exports.getSupplierProducts = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('products.inventoryId', 'name sku category price cost stock reorderLevel');

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ data: supplier.products });
  } catch (error) {
    console.error('Error fetching supplier products:', error);
    res.status(500).json({ 
      error: 'Failed to fetch supplier products',
      details: error.message 
    });
  }
};

/**
 * Add product to supplier
 */
exports.addProductToSupplier = async (req, res) => {
  try {
    const { inventoryId, supplierProductCode, lastPurchasePrice, minimumOrderQuantity } = req.body;
    const supplierId = req.params.id;

    // Check if inventory item exists
    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Check if product already linked
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const existingProduct = supplier.products.find(
      p => p.inventoryId.toString() === inventoryId
    );

    if (existingProduct) {
      return res.status(400).json({ 
        error: 'Product already linked to this supplier'
      });
    }

    // Add product
    supplier.products.push({
      inventoryId,
      supplierProductCode,
      lastPurchasePrice,
      minimumOrderQuantity: minimumOrderQuantity || 1
    });

    await supplier.save();

    // Update inventory preferred supplier if not set
    if (!inventory.preferredSupplierId) {
      inventory.preferredSupplierId = supplierId;
      await inventory.save();
    }

    res.json({ 
      data: supplier,
      message: 'Product added to supplier successfully'
    });
  } catch (error) {
    console.error('Error adding product to supplier:', error);
    res.status(500).json({ 
      error: 'Failed to add product to supplier',
      details: error.message 
    });
  }
};

/**
 * Remove product from supplier
 */
exports.removeProductFromSupplier = async (req, res) => {
  try {
    const { supplierId, inventoryId } = req.params;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Remove product
    supplier.products = supplier.products.filter(
      p => p.inventoryId.toString() !== inventoryId
    );

    await supplier.save();

    res.json({ 
      data: supplier,
      message: 'Product removed from supplier successfully'
    });
  } catch (error) {
    console.error('Error removing product from supplier:', error);
    res.status(500).json({ 
      error: 'Failed to remove product from supplier',
      details: error.message 
    });
  }
};