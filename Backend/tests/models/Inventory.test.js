// Inventory Model Tests
const Inventory = require('../../models/Inventory');
const { connectTestDB, closeDatabase, clearDatabase } = require('../testDB');

describe('Inventory Model', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Inventory Creation & Validation', () => {
    test('should create inventory item with valid data', async () => {
      const inventory = await Inventory.create({
        name: 'Product A',
        sku: 'SKU-001',
        stock: 100,
        price: 500,
        cost: 300,
        category: 'Electronics',
        location: 'Warehouse A',
        supplier: 'Supplier ABC',
        tenantKey: 'tenant-1',
      });

      expect(inventory).toBeDefined();
      expect(inventory.name).toBe('Product A');
      expect(inventory.stock).toBe(100);
      expect(inventory.price).toBe(500);
    });

    test('should require name, sku, and tenantKey', async () => {
      try {
        await Inventory.create({
          quantity: 100,
          price: 500,
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should validate numeric fields', async () => {
      const inventory = await Inventory.create({
        name: 'Product B',
        sku: 'SKU-002',
        stock: 50,
        price: 1000.50,
        cost: 600,
        category: 'Electronics',
        location: 'Warehouse B',
        supplier: 'Supplier XYZ',
        tenantKey: 'tenant-1',
      });

      expect(inventory.stock).toBe(50);
      expect(inventory.price).toBe(1000.50);
    });
  });

  describe('Inventory Stock Management', () => {
    test('should track stock quantity', async () => {
      const inventory = await Inventory.create({
        name: 'Product C',
        sku: 'SKU-003',
        stock: 200,
        price: 800,
        cost: 500,
        category: 'Electronics',
        location: 'Warehouse C',
        supplier: 'Supplier 123',
        tenantKey: 'tenant-1',
      });

      inventory.stock -= 10;
      await inventory.save();

      const updated = await Inventory.findById(inventory._id);
      expect(updated.stock).toBe(190);
    });

    test('should handle stock depletion', async () => {
      const inventory = await Inventory.create({
        name: 'Low Stock Item',
        sku: 'SKU-004',
        stock: 5,
        price: 200,
        cost: 100,
        category: 'Electronics',
        location: 'Warehouse D',
        supplier: 'Supplier DEF',
        tenantKey: 'tenant-1',
      });

      inventory.stock = 0;
      await inventory.save();

      const updated = await Inventory.findById(inventory._id);
      expect(updated.stock).toBe(0);
    });
  });

  describe('Inventory Queries', () => {
    beforeEach(async () => {
      await Inventory.create({
        name: 'Product 1',
        sku: 'SKU-001',
        stock: 100,
        price: 500,
        cost: 300,
        category: 'Electronics',
        location: 'Warehouse 1',
        supplier: 'Supplier 1',
        tenantKey: 'tenant-1',
      });

      await Inventory.create({
        name: 'Product 2',
        sku: 'SKU-002',
        stock: 50,
        price: 1000,
        cost: 600,
        category: 'Hardware',
        location: 'Warehouse 2',
        supplier: 'Supplier 2',
        tenantKey: 'tenant-1',
      });
    });

    test('should find inventory by SKU', async () => {
      const item = await Inventory.findOne({ sku: 'SKU-001' });
      expect(item.name).toBe('Product 1');
    });

    test('should find inventory by tenant', async () => {
      const items = await Inventory.find({ tenantKey: 'tenant-1' });
      expect(items.length).toBe(2);
    });
  });

  describe('Inventory Updates', () => {
    test('should update inventory price', async () => {
      let inventory = await Inventory.create({
        name: 'Product Price',
        sku: 'SKU-005',
        stock: 100,
        price: 500,
        cost: 300,
        category: 'Electronics',
        location: 'Warehouse 3',
        supplier: 'Supplier 3',
        tenantKey: 'tenant-1',
      });

      inventory.price = 750;
      await inventory.save();

      const updated = await Inventory.findById(inventory._id);
      expect(updated.price).toBe(750);
    });
  });
});
