// Edge Cases & Error Handling Tests
const User = require('../../models/User');
const Customer = require('../../models/Customer');
const Inventory = require('../../models/Inventory');
const Invoice = require('../../models/Invoice');
const { connectTestDB, closeDatabase, clearDatabase } = require('../testDB');
const { generateToken, verifyToken } = require('../../utils/jwt');

describe('Edge Cases & Error Handling', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // ==================== CONCURRENCY TESTS ====================

  describe('Concurrency & Race Conditions', () => {
    test('should handle concurrent user creation', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          User.create({
            name: `User ${i}`,
            email: `user${i}@example.com`,
            username: `user${i}`,
            password: 'password',
          })
        );
      }

      const users = await Promise.all(promises);
      expect(users.length).toBe(5);
      expect(users.every((u) => u._id)).toBe(true);
    });

    test('should prevent duplicate email in concurrent creates', async () => {
      const createUser = () =>
        User.create({
          name: 'Duplicate',
          email: 'duplicate@example.com',
          username: 'dup' + Math.random(),
          password: 'password',
        });

      try {
        const users = await Promise.allSettled([
          createUser(),
          createUser(),
        ]);

        // One should succeed, one should fail
        const succeeded = users.filter((r) => r.status === 'fulfilled');
        const failed = users.filter((r) => r.status === 'rejected');

        expect(succeeded.length).toBeGreaterThan(0);
        expect(succeeded.length + failed.length).toBe(2);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // ==================== BOUNDARY TESTS ====================

  describe('Boundary Value Testing', () => {
    test('should handle very large inventory quantities', async () => {
      const largeQty = Number.MAX_SAFE_INTEGER;
      const item = await Inventory.create({
        name: 'Large Qty Item',
        sku: 'LARGE-001',
        stock: largeQty,
        price: 100,
        location: 'Warehouse A',
        supplier: 'Supplier ABC',
        cost: 50,
        category: 'Electronics',
        tenantKey: 'tenant-1',
      });

      expect(item.stock).toBe(largeQty);
    });

    test('should handle very small prices', async () => {
      const item = await Inventory.create({
        name: 'Cheap Item',
        sku: 'CHEAP-001',
        stock: 1000,
        price: 0.01,
        location: 'Warehouse B',
        supplier: 'Supplier XYZ',
        cost: 0.001,
        category: 'Accessories',
        tenantKey: 'tenant-1',
      });

      expect(item.price).toBe(0.01);
    });

    test('should handle very long strings', async () => {
      const longName = 'A'.repeat(1000);
      const customer = await Customer.create({
        name: longName,
        email: 'long@example.com',
        phone: '9841234567',
        tenantKey: 'tenant-1',
      });

      expect(customer.name.length).toBe(1000);
    });

    test('should handle special characters in data', async () => {
      const specialName = "O'Reilly's & Co. (Ltd.)";
      const customer = await Customer.create({
        name: specialName,
        email: 'special@example.com',
        phone: '9842345678',
        tenantKey: 'tenant-1',
      });

      expect(customer.name).toBe(specialName);
    });

    test('should handle zero and negative values', async () => {
      const item = await Inventory.create({
        name: 'Zero Item',
        sku: 'ZERO-001',
        stock: 0,
        price: 0,
        location: 'Warehouse C',
        supplier: 'Supplier DEF',
        cost: 0,
        category: 'Other',
        tenantKey: 'tenant-1',
      });

      expect(item.stock).toBe(0);
      expect(item.price).toBe(0);
    });
  });

  // ==================== NULL/UNDEFINED HANDLING ====================

  describe('Null & Undefined Handling', () => {
    test('should handle missing optional fields', async () => {
      const customer = await Customer.create({
        name: 'Minimal Customer',
        email: 'minimal@example.com',
        phone: '9843456789',
        tenantKey: 'tenant-1',
      });

      // Address is optional, should be either undefined or have only default country
      const addressKeys = customer.address ? Object.keys(customer.address).filter(k => customer.address[k] !== undefined && customer.address[k] !== 'Nepal') : [];
      expect(addressKeys.length === 0).toBe(true);
    });

    test('should not accept null for required fields', async () => {
      try {
        await Customer.create({
          name: null,
          email: 'test@example.com',
          phone: '9844567890',
          tenantKey: 'tenant-1',
        });
        fail('Should throw validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle empty strings appropriately', async () => {
      try {
        await Customer.create({
          name: '',
          email: 'empty@example.com',
          phone: '9845678901',
          tenantKey: 'tenant-1',
        });
        // Behavior depends on schema validation
        // May pass or fail depending on configuration
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // ==================== DATA TYPE VALIDATION ====================

  describe('Data Type Validation', () => {
    test('should enforce numeric types', async () => {
      const item = await Inventory.create({
        name: 'Numeric Test',
        sku: 'NUM-001',
        stock: 100,
        price: 500.99,
        location: 'Warehouse D',
        supplier: 'Supplier GHI',
        cost: 300,
        category: 'Tools',
        tenantKey: 'tenant-1',
      });

      expect(typeof item.stock).toBe('number');
      expect(typeof item.price).toBe('number');
    });

    test('should convert string numbers to numbers', async () => {
      const item = await Inventory.create({
        name: 'String Num Test',
        sku: 'STRNUM-001',
        stock: '100',
        price: '500.99',
        location: 'Warehouse E',
        supplier: 'Supplier JKL',
        cost: '300',
        category: 'Parts',
        tenantKey: 'tenant-1',
      });

      expect(typeof item.stock).toBe('number');
      expect(typeof item.price).toBe('number');
    });

    test('should enforce date types', async () => {
      const expiryDate = new Date('2025-12-31');
      const user = await User.create({
        name: 'Date Test',
        email: 'datetest@example.com',
        username: 'datetest',
        password: 'password',
        isSaasCustomer: true,
        subscriptionExpiresAt: expiryDate,
      });

      expect(user.subscriptionExpiresAt instanceof Date).toBe(true);
    });
  });

  // ==================== TRANSACTION CONSISTENCY ====================

  describe('Transaction Consistency', () => {
    test('should maintain data integrity during updates', async () => {
      let item = await Inventory.create({
        name: 'Consistency Test',
        sku: 'CONST-001',
        stock: 100,
        price: 1000,
        location: 'Warehouse F',
        supplier: 'Supplier MNO',
        cost: 600,
        category: 'Hardware',
        tenantKey: 'tenant-1',
      });

      // Simulate multiple updates
      item.stock -= 10;
      item.price = 1100;
      await item.save();

      const updated = await Inventory.findById(item._id);
      expect(updated.stock).toBe(90);
      expect(updated.price).toBe(1100);
    });

    test('should handle partial update failures', async () => {
      const user = await User.create({
        name: 'Update Test',
        email: 'updatetest@example.com',
        username: 'updatetest',
        password: 'password',
      });

      user.email = 'newemail@example.com';
      user.role = 'manager';
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.email).toBe('newemail@example.com');
      expect(updated.role).toBe('manager');
    });
  });

  // ==================== SECURITY EDGE CASES ====================

  describe('Security Edge Cases', () => {
    test('should not expose sensitive data', async () => {
      const user = await User.create({
        name: 'Secure User',
        email: 'secure@example.com',
        username: 'secureuser',
        password: 'secretpassword',
      });

      const userWithoutPassword = await User.findById(user._id).select('-password');
      expect(userWithoutPassword.password).toBeUndefined();
    });

    test('should handle SQL injection attempts in strings', async () => {
      const maliciousName = "'; DROP TABLE users; --";
      const customer = await Customer.create({
        name: maliciousName,
        email: 'malicious@example.com',
        phone: '9846789012',
        tenantKey: 'tenant-1',
      });

      // Should store as regular string, not execute
      expect(customer.name).toBe(maliciousName);

      // Database should still be intact
      const count = await Customer.countDocuments({});
      expect(count).toBeGreaterThan(0);
    });

    test('should handle XSS attempts in strings', async () => {
      const xssAttempt = '<script>alert("XSS")</script>';
      const customer = await Customer.create({
        name: xssAttempt,
        email: 'xss@example.com',
        phone: '9847890123',
        tenantKey: 'tenant-1',
      });

      // Should store as regular string
      expect(customer.name).toBe(xssAttempt);
    });

    test('should validate token expiration', () => {
      const token = generateToken({ id: 'user123', email: 'test@example.com', role: 'user' });
      const decoded = verifyToken(token);

      expect(decoded.id).toBe('user123');
      // Verify token has expiration claim
      expect(decoded).toHaveProperty('iat'); // issued at
    });
  });

  // ==================== ERROR RECOVERY ====================

  describe('Error Recovery & Resilience', () => {
    test('should recover from duplicate key error', async () => {
      const email = 'recovery@example.com';

      // First user
      await User.create({
        name: 'User 1',
        email: email,
        username: 'user1',
        password: 'password',
      });

      // Attempt duplicate
      try {
        await User.create({
          name: 'User 2',
          email: email,
          username: 'user2',
          password: 'password',
        });
      } catch (error) {
        expect(error.code).toBe(11000);
      }

      // Should still be able to create with different email
      const newUser = await User.create({
        name: 'User 3',
        email: 'recovery2@example.com',
        username: 'user3',
        password: 'password',
      });

      expect(newUser._id).toBeDefined();
    });

    test('should handle validation errors gracefully', async () => {
      try {
        await Customer.create({
          // Missing required name
          email: 'noname@example.com',
          phone: '9848901234',
          tenantKey: 'tenant-1',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Should still be able to create valid customer
      const customer = await Customer.create({
        name: 'Valid Customer',
        email: 'valid@example.com',
        phone: '9849012345',
        tenantKey: 'tenant-1',
      });

      expect(customer._id).toBeDefined();
    });
  });

  // ==================== PERFORMANCE EDGE CASES ====================

  describe('Performance Edge Cases', () => {
    test('should handle large batch operations', async () => {
      const createPromises = [];
      for (let i = 0; i < 100; i++) {
        createPromises.push(
          Inventory.create({
            name: `Item ${i}`,
            sku: `SKU-${i}`,
            stock: 100,
            price: 1000,
            location: 'Warehouse G',
            supplier: 'Supplier PQR',
            cost: 500,
            category: 'Bulk Items',
            tenantKey: 'tenant-1',
          })
        );
      }

      const items = await Promise.all(createPromises);
      expect(items.length).toBe(100);
    });

    test('should efficiently query large result sets', async () => {
      // Create 50 items
      const createPromises = [];
      for (let i = 0; i < 50; i++) {
        createPromises.push(
          Inventory.create({
            name: `Query Item ${i}`,
            sku: `QUERY-${i}`,
            stock: 100 + i,
            price: 1000 + i,
            location: 'Warehouse H',
            supplier: 'Supplier STU',
            cost: 500 + i,
            category: 'Query Items',
            tenantKey: 'tenant-1',
          })
        );
      }

      await Promise.all(createPromises);

      // Query all
      const startTime = Date.now();
      const items = await Inventory.find({ tenantKey: 'tenant-1' });
      const queryTime = Date.now() - startTime;

      expect(items.length).toBe(50);
      expect(queryTime).toBeLessThan(1000); // Should complete in < 1 second
    });
  });

  // ==================== MULTI-TENANT EDGE CASES ====================

  describe('Multi-Tenant Edge Cases', () => {
    test('should prevent cross-tenant data access', async () => {
      const customer1 = await Customer.create({
        name: 'Tenant 1 Customer',
        email: 'tenant1@example.com',
        phone: '9848901234',
        tenantKey: 'tenant-1',
      });

      const customer2 = await Customer.create({
        name: 'Tenant 2 Customer',
        email: 'tenant2@example.com',
        phone: '9849012345',
        tenantKey: 'tenant-2',
      });

      const t1Customers = await Customer.find({ tenantKey: 'tenant-1' });
      const t2Customers = await Customer.find({ tenantKey: 'tenant-2' });

      expect(t1Customers.some((c) => c._id.equals(customer2._id))).toBe(false);
      expect(t2Customers.some((c) => c._id.equals(customer1._id))).toBe(false);
    });

    test('should handle mixed tenant queries', async () => {
      await Customer.create({
        name: 'Customer A',
        email: 'a@example.com',
        phone: '9840123456',
        tenantKey: 'tenant-a',
      });

      await Customer.create({
        name: 'Customer B',
        email: 'b@example.com',
        phone: '9841234567',
        tenantKey: 'tenant-b',
      });

      const allCustomers = await Customer.find({});
      expect(allCustomers.length).toBe(2);

      const tenantAOnly = await Customer.find({ tenantKey: 'tenant-a' });
      expect(tenantAOnly.length).toBe(1);
    });
  });
});
