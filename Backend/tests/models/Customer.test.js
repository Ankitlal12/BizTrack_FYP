// Customer Model Tests
const Customer = require('../../models/Customer');
const { connectTestDB, closeDatabase, clearDatabase } = require('../testDB');

describe('Customer Model', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Customer Creation & Validation', () => {
    test('should create a customer with valid data', async () => {
      const customer = await Customer.create({
        name: 'ABC Company',
        email: 'abc@company.com',
        phone: '9841234567',
        tenantKey: 'tenant-1',
      });

      expect(customer).toBeDefined();
      expect(customer.name).toBe('ABC Company');
      expect(customer.email).toBe('abc@company.com');
    });

    test('should require name and tenantKey', async () => {
      try {
        await Customer.create({
          email: 'noname@company.com',
          phone: '9841234567',
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should store customer with default active status', async () => {
      const customer = await Customer.create({
        name: 'Test Customer',
        email: 'test@company.com',
        phone: '9841234567',
        tenantKey: 'tenant-1',
      });

      expect(customer.isActive).toBe(true);
    });
  });

  describe('Customer Queries', () => {
    beforeEach(async () => {
      await Customer.create({
        name: 'Customer 1',
        email: 'customer1@example.com',
        phone: '9841111111',
        tenantKey: 'tenant-1',
      });

      await Customer.create({
        name: 'Customer 2',
        email: 'customer2@example.com',
        phone: '9842222222',
        tenantKey: 'tenant-1',
      });
    });

    test('should find customer by id', async () => {
      const customer = await Customer.findOne({ name: 'Customer 1' });
      const found = await Customer.findById(customer._id);
      expect(found.name).toBe('Customer 1');
    });

    test('should find customers by tenant', async () => {
      const customers = await Customer.find({ tenantKey: 'tenant-1' });
      expect(customers.length).toBe(2);
    });
  });

  describe('Customer Updates', () => {
    test('should update customer details', async () => {
      let customer = await Customer.create({
        name: 'Original Name',
        email: 'original@company.com',
        phone: '9841234567',
        tenantKey: 'tenant-1',
      });

      customer.name = 'Updated Name';
      customer.phone = '9876543210';
      await customer.save();

      const updated = await Customer.findById(customer._id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.phone).toBe('9876543210');
    });

    test('should deactivate customer', async () => {
      const customer = await Customer.create({
        name: 'Active Customer',
        email: 'active@company.com',
        phone: '9843333333',
        tenantKey: 'tenant-1',
      });

      customer.isActive = false;
      await customer.save();

      const updated = await Customer.findById(customer._id);
      expect(updated.isActive).toBe(false);
    });
  });
});
