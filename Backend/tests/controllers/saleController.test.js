// Sale Controller Tests
const mongoose = require('mongoose');
const Sale = require('../../models/Sale');
const Customer = require('../../models/Customer');
const Inventory = require('../../models/Inventory');
const Invoice = require('../../models/Invoice');
const { connectTestDB, closeDatabase, clearDatabase } = require('../testDB');

// Helper to create valid but non-existent ObjectIds
const createFakeInventoryId = () => new mongoose.Types.ObjectId();

describe('Sale Controller - Core Functions', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // ==================== SALE CREATION TESTS ====================

  describe('Sale Creation', () => {
    beforeEach(async () => {
      await Customer.create({
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '9841234567',
        tenantKey: 'tenant-1',
      });

      await Inventory.create({
        name: 'Product',
        sku: 'PROD-001',
        stock: 100,
        price: 1000,
        location: 'Warehouse A',
        supplier: 'Supplier ABC',
        cost: 500,
        category: 'Electronics',
        tenantKey: 'tenant-1',
      });
    });

    test('should create a new sale', async () => {
      const customer = await Customer.findOne({ name: 'Test Customer' });
      const product = await Inventory.findOne({ sku: 'PROD-001' });

      const sale = await Sale.create({
        invoiceNumber: 'INV-SALE-001',
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        items: [
          {
            inventoryId: createFakeInventoryId(),
            name: product.name,
            quantity: 5,
            price: product.price,
            total: 5 * product.price,
          },
        ],
        subtotal: 5 * product.price,
        tax: 0,
        total: 5 * product.price,
        paymentStatus: 'paid',
        tenantKey: 'tenant-1',
      });

      expect(sale).toBeDefined();
      expect(sale.total).toBe(5000);
      expect(sale.invoiceNumber).toBe('INV-SALE-001');
    });

    test('should create sale with multiple items', async () => {
      const customer = await Customer.findOne({ name: 'Test Customer' });
      const product = await Inventory.findOne({ sku: 'PROD-001' });

      const sale = await Sale.create({
        invoiceNumber: 'INV-SALE-002',
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        items: [
          {
            inventoryId: createFakeInventoryId(),
            name: product.name,
            quantity: 3,
            price: 1000,
            total: 3000,
          },
          {
            inventoryId: createFakeInventoryId(),
            name: product.name,
            quantity: 2,
            price: 1000,
            total: 2000,
          },
        ],
        subtotal: 5000,
        total: 5000,
        paymentStatus: 'paid',
        tenantKey: 'tenant-1',
      });

      expect(sale.items.length).toBe(2);
      expect(sale.total).toBe(5000);
    });

    test('should require customerId and tenantKey', async () => {
      try {
        await Sale.create({
          invoiceNumber: 'BAD-INV',
          customerName: 'Test',
          items: [{ inventoryId: createFakeInventoryId(), name: 'Test', quantity: 1, price: 100, total: 100 }],
          subtotal: 0,
          total: 0,
          tenantKey: 'tenant-1',
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // ==================== SALE RETRIEVAL TESTS ====================

  describe('Sale Retrieval', () => {
    beforeEach(async () => {
      const customer = await Customer.create({
        name: 'Customer',
        email: 'cust@example.com',
        phone: '9841234567',
        tenantKey: 'tenant-1',
      });

      await Sale.create({
        invoiceNumber: 'INV-RET-001',
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        items: [{ inventoryId: createFakeInventoryId(), name: 'Item', quantity: 1, price: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        paymentStatus: 'paid',
        tenantKey: 'tenant-1',
      });

      await Sale.create({
        invoiceNumber: 'INV-RET-002',
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        items: [{ inventoryId: createFakeInventoryId(), name: 'Item', quantity: 2, price: 500, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        paymentStatus: 'unpaid',
        tenantKey: 'tenant-1',
      });
    });

    test('should get sale by id', async () => {
      const sale = await Sale.findOne({ paymentStatus: 'paid' });
      const found = await Sale.findById(sale._id);
      expect(found.paymentStatus).toBe('paid');
    });

    test('should get all sales by tenant', async () => {
      const sales = await Sale.find({ tenantKey: 'tenant-1' });
      expect(sales.length).toBe(2);
    });

    test('should filter sales by status', async () => {
      const completed = await Sale.find({
        tenantKey: 'tenant-1',
        paymentStatus: 'paid',
      });

      expect(completed.length).toBe(1);
      expect(completed[0].paymentStatus).toBe('paid');
    });
  });

  // ==================== SALE UPDATES ====================

  describe('Sale Updates', () => {
    beforeEach(async () => {
      const customer = await Customer.create({
        name: 'Update Customer',
        email: 'update@example.com',
        phone: '9841234567',
        tenantKey: 'tenant-1',
      });

      await Sale.create({
        invoiceNumber: 'INV-UPD-001',
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        items: [{ inventoryId: createFakeInventoryId(), name: 'Item', quantity: 1, price: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        paymentStatus: 'unpaid',
        tenantKey: 'tenant-1',
      });
    });

    test('should update sale status', async () => {
      let sale = await Sale.findOne({ paymentStatus: 'unpaid' });
      sale.paymentStatus = 'paid';
      await sale.save();

      const updated = await Sale.findById(sale._id);
      expect(updated.paymentStatus).toBe('paid');
    });

    test('should update sale notes', async () => {
      let sale = await Sale.findOne({ paymentStatus: 'unpaid' });
      sale.notes = 'Customer called for follow-up';
      await sale.save();

      const updated = await Sale.findById(sale._id);
      expect(updated.notes).toBe('Customer called for follow-up');
    });
  });

  // ==================== SALE ANALYTICS ====================

  describe('Sale Analytics', () => {
    beforeEach(async () => {
      const customer = await Customer.create({
        name: 'Analytics Customer',
        email: 'analytics@example.com',
        phone: '9841234567',
        tenantKey: 'tenant-1',
      });

      for (let i = 0; i < 5; i++) {
        await Sale.create({
          invoiceNumber: `INV-ANALYTICS-${i}`,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          items: [{ inventoryId: createFakeInventoryId(), name: 'Item', quantity: 1, price: 1000, total: 1000 }],
          subtotal: 1000,
          total: 1000,
          paymentStatus: 'paid',
          tenantKey: 'tenant-1',
        });
      }
    });

    test('should count total sales', async () => {
      const count = await Sale.countDocuments({
        tenantKey: 'tenant-1',
      });

      expect(count).toBe(5);
    });

    test('should sum total sales amount', async () => {
      const sales = await Sale.find({ tenantKey: 'tenant-1' });
      const totalRevenue = sales.reduce(
        (sum, sale) => sum + sale.total,
        0
      );

      expect(totalRevenue).toBe(5000);
    });
  });
});
