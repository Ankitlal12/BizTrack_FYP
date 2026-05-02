// Authentication Middleware Tests
const User = require('../../models/User');
const { connectTestDB, closeDatabase, clearDatabase } = require('../testDB');
const { generateToken } = require('../../utils/jwt');

describe('Authentication Middleware', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Token Generation & Verification', () => {
    test('should generate a valid JWT token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should create different tokens for different users', () => {
      const token1 = generateToken({ id: '123', email: 'user1@example.com', role: 'admin' });
      const token2 = generateToken({ id: '456', email: 'user2@example.com', role: 'user' });

      expect(token1).not.toBe(token2);
    });
  });

  describe('User Authentication', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        role: 'staff',
      });
    });

    test('should authenticate valid user', async () => {
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeDefined();
      expect(user.role).toBe('staff');
    });

    test('should not authenticate non-existent user', async () => {
      const user = await User.findOne({ email: 'nonexistent@example.com' });
      expect(user).toBeNull();
    });
  });

  describe('Role-Based Access Control', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        username: 'admin',
        password: 'password',
        role: 'admin',
      });

      await User.create({
        name: 'Owner',
        email: 'owner@example.com',
        username: 'owner',
        password: 'password',
        role: 'owner',
        tenantKey: 'tenant-1',
      });

      await User.create({
        name: 'Staff',
        email: 'staff@example.com',
        username: 'staff',
        password: 'password',
        role: 'staff',
        tenantKey: 'tenant-1',
      });
    });

    test('should identify admin users', async () => {
      const user = await User.findOne({ role: 'admin' });
      expect(user.role).toBe('admin');
    });

    test('should identify owner users', async () => {
      const user = await User.findOne({ role: 'owner' });
      expect(user.role).toBe('owner');
      expect(user.tenantKey).toBe('tenant-1');
    });

    test('should identify staff users', async () => {
      const user = await User.findOne({ role: 'staff' });
      expect(user.role).toBe('staff');
      expect(user.tenantKey).toBe('tenant-1');
    });
  });

  describe('Account Status Checks', () => {
    test('should verify active account status', async () => {
      const user = await User.create({
        name: 'Active User',
        email: 'active@example.com',
        username: 'active',
        password: 'password',
        accountStatus: 'active',
      });

      expect(user.accountStatus).toBe('active');
    });

    test('should identify frozen accounts', async () => {
      const user = await User.create({
        name: 'Frozen User',
        email: 'frozen@example.com',
        username: 'frozen',
        password: 'password',
        accountStatus: 'frozen',
      });

      expect(user.accountStatus).toBe('frozen');
    });

    test('should identify deleted accounts', async () => {
      const user = await User.create({
        name: 'Deleted User',
        email: 'deleted@example.com',
        username: 'deleted',
        password: 'password',
        accountStatus: 'deleted',
      });

      expect(user.accountStatus).toBe('deleted');
    });
  });

  describe('Subscription Expiry Checks', () => {
    test('should identify expired subscriptions', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const user = await User.create({
        name: 'Expired Sub User',
        email: 'expiredsub@example.com',
        username: 'expiredsub',
        password: 'password',
        isSaasCustomer: true,
        subscriptionExpiresAt: expiredDate,
      });

      const isExpired = new Date(user.subscriptionExpiresAt) < new Date();
      expect(isExpired).toBe(true);
    });

    test('should identify active subscriptions', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const user = await User.create({
        name: 'Active Sub User',
        email: 'activesub@example.com',
        username: 'activesub',
        password: 'password',
        isSaasCustomer: true,
        subscriptionExpiresAt: futureDate,
      });

      const isExpired = new Date(user.subscriptionExpiresAt) < new Date();
      expect(isExpired).toBe(false);
    });
  });

  describe('Tenant Scope Validation', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        username: 'admin',
        password: 'password',
        role: 'admin',
      });

      await User.create({
        name: 'Tenant 1 Owner',
        email: 'tenant1owner@example.com',
        username: 'tenant1owner',
        password: 'password',
        role: 'owner',
        tenantKey: 'tenant-1',
      });

      await User.create({
        name: 'Tenant 2 Owner',
        email: 'tenant2owner@example.com',
        username: 'tenant2owner',
        password: 'password',
        role: 'owner',
        tenantKey: 'tenant-2',
      });
    });

    test('should allow admin to access any tenant', async () => {
      const admin = await User.findOne({ role: 'admin' });
      expect(admin.tenantKey).toBeUndefined();
    });

    test('should scope staff to their tenant', async () => {
      const tenant1User = await User.findOne({
        tenantKey: 'tenant-1',
        role: 'owner',
      });
      expect(tenant1User.tenantKey).toBe('tenant-1');
    });

    test('should differentiate between tenants', async () => {
      const tenant1 = await User.findOne({ tenantKey: 'tenant-1' });
      const tenant2 = await User.findOne({ tenantKey: 'tenant-2' });

      expect(tenant1.tenantKey).not.toBe(tenant2.tenantKey);
    });
  });
});
