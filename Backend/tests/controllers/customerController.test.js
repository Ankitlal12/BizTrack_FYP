// Customer Controller Tests
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const { connectTestDB, closeDatabase, clearDatabase } = require('../testDB');

describe('Customer Controller - Core Functions', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // ==================== CUSTOMER CREATION TESTS ====================

  describe('Customer Creation', () => {
    test('should create a new customer', async () => {
      const customer = await Customer.create({
        name: 'New Customer',
        email: 'customer@example.com',
        phone: '9841234567',
        tenantKey: 'tenant-1',
      });

      expect(customer).toBeDefined();
      expect(customer.name).toBe('New Customer');
      expect(customer.isActive).toBe(true);
    });

    test('should create customer with address', async () => {
      const customer = await Customer.create({
        name: 'Customer with Address',
        email: 'address@example.com',
        phone: '9841111111',
        address: {
          street: 'Bagbazar Street',
          city: 'Kathmandu',
          state: 'Kathmandu',
          country: 'Nepal',
        },
        tenantKey: 'tenant-1',
      });

      expect(customer.address.city).toBe('Kathmandu');
    });

    test('should require name', async () => {
      try {
        await Customer.create({
          email: 'noname@example.com',
          phone: '9841234567',
          tenantKey: 'tenant-1',
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should require tenantKey', async () => {
      try {
        await Customer.create({
          name: 'No Tenant',
          email: 'notenant@example.com',
          phone: '9841234567',
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // ==================== CUSTOMER RETRIEVAL TESTS ====================

  describe('Customer Retrieval', () => {
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

      await Customer.create({
        name: 'Tenant 2 Customer',
        email: 'tenant2customer@example.com',
        phone: '9843333333',
        tenantKey: 'tenant-2',
      });
    });

    test('should get customer by id', async () => {
      const customer = await Customer.findOne({ name: 'Customer 1' });
      const found = await Customer.findById(customer._id);
      expect(found.name).toBe('Customer 1');
    });

    test('should get customer by email', async () => {
      const customer = await Customer.findOne({ email: 'customer1@example.com' });
      expect(customer.name).toBe('Customer 1');
    });

    test('should get all customers by tenant', async () => {
      const customers = await Customer.find({ tenantKey: 'tenant-1' });
      expect(customers.length).toBe(2);
    });

    test('should return empty array for non-existent tenant', async () => {
      const customers = await Customer.find({ tenantKey: 'nonexistent' });
      expect(customers.length).toBe(0);
    });

    test('should handle multi-tenant isolation', async () => {
      const tenant1 = await Customer.find({ tenantKey: 'tenant-1' });
      const tenant2 = await Customer.find({ tenantKey: 'tenant-2' });

      expect(tenant1.length).toBe(2);
      expect(tenant2.length).toBe(1);
      expect(tenant1[0].tenantKey).not.toBe(tenant2[0].tenantKey);
    });
  });

  // ==================== CUSTOMER UPDATE TESTS ====================

  describe('Customer Update', () => {
    beforeEach(async () => {
      await Customer.create({
        name: 'Original Customer',
        email: 'original@example.com',
        phone: '9840000000',
        tenantKey: 'tenant-1',
      });
    });

    test('should update customer name', async () => {
      let customer = await Customer.findOne({ email: 'original@example.com' });
      customer.name = 'Updated Customer';
      await customer.save();

      const updated = await Customer.findById(customer._id);
      expect(updated.name).toBe('Updated Customer');
    });

    test('should update customer contact info', async () => {
      let customer = await Customer.findOne({ email: 'original@example.com' });
      customer.phone = '9849999999';
      customer.email = 'newemail@example.com';
      await customer.save();

      const updated = await Customer.findById(customer._id);
      expect(updated.phone).toBe('9849999999');
      expect(updated.email).toBe('newemail@example.com');
    });

    test('should deactivate customer', async () => {
      let customer = await Customer.findOne({ email: 'original@example.com' });
      customer.isActive = false;
      await customer.save();

      const updated = await Customer.findById(customer._id);
      expect(updated.isActive).toBe(false);
    });

    test('should reactivate customer', async () => {
      let customer = await Customer.findOne({ email: 'original@example.com' });
      customer.isActive = false;
      await customer.save();

      customer.isActive = true;
      await customer.save();

      const updated = await Customer.findById(customer._id);
      expect(updated.isActive).toBe(true);
    });
  });

  // ==================== CUSTOMER DELETION TESTS ====================

  describe('Customer Deletion', () => {
    test('should soft delete customer', async () => {
      const customer = await Customer.create({
        name: 'To Deactivate',
        email: 'todeactivate@example.com',
        phone: '9844444444',
        tenantKey: 'tenant-1',
      });

      customer.isActive = false;
      await customer.save();

      const inactive = await Customer.findById(customer._id);
      expect(inactive.isActive).toBe(false);
    });

    test('should hard delete customer', async () => {
      const customer = await Customer.create({
        name: 'To Delete',
        email: 'todelete@example.com',
        phone: '9844444444',
        tenantKey: 'tenant-1',
      });

      await Customer.deleteOne({ _id: customer._id });
      const notFound = await Customer.findById(customer._id);
      expect(notFound).toBeNull();
    });
  });

  // ==================== CUSTOMER QUERY TESTS ====================

  describe('Customer Advanced Queries', () => {
    beforeEach(async () => {
      await Customer.create({
        name: 'Active Customer 1',
        email: 'active1@example.com',
        phone: '9845555555',
        isActive: true,
        tenantKey: 'tenant-1',
      });

      await Customer.create({
        name: 'Inactive Customer',
        email: 'inactive@example.com',
        phone: '9846666666',
        isActive: false,
        tenantKey: 'tenant-1',
      });
    });

    test('should filter active customers', async () => {
      const activeCustomers = await Customer.find({
        tenantKey: 'tenant-1',
        isActive: true,
      });

      expect(activeCustomers.length).toBe(1);
      expect(activeCustomers[0].name).toBe('Active Customer 1');
    });

    test('should filter inactive customers', async () => {
      const inactiveCustomers = await Customer.find({
        tenantKey: 'tenant-1',
        isActive: false,
      });

      expect(inactiveCustomers.length).toBe(1);
      expect(inactiveCustomers[0].name).toBe('Inactive Customer');
    });

    test('should search customer by name', async () => {
      const customer = await Customer.findOne({
        name: /Active/i,
        tenantKey: 'tenant-1',
      });

      expect(customer).toBeDefined();
      expect(customer.name).toContain('Active');
    });
  });
});
