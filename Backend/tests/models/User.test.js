// User Model Tests
const User = require('../../models/User');
const { connectTestDB, closeDatabase, clearDatabase } = require('../testDB');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // ==================== VALIDATION TESTS ====================

  describe('User Creation & Validation', () => {
    test('should create a user with valid data', async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        password: 'hashed_password',
        role: 'staff',
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('john@example.com');
      expect(user.name).toBe('John Doe');
      expect(user.role).toBe('staff');
    });

    test('should fail to create user without required fields', async () => {
      try {
        await User.create({ email: 'test@example.com' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should enforce unique email constraint', async () => {
      await User.create({
        name: 'User 1',
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'password',
      });

      try {
        await User.create({
          name: 'User 2',
          email: 'duplicate@example.com',
          username: 'user2',
          password: 'password',
        });
        fail('Should have thrown duplicate key error');
      } catch (error) {
        expect(error.code).toBe(11000);
      }
    });

    test('should allow Google users without password and username', async () => {
      const user = await User.create({
        name: 'Google User',
        email: 'guser@gmail.com',
        googleId: 'google_123456',
        avatar: 'https://example.com/avatar.jpg',
      });

      expect(user.googleId).toBe('google_123456');
      expect(user.password).toBeUndefined();
      expect(user.username).toBeUndefined();
    });
  });

  // ==================== FIELD TESTS ====================

  describe('User Fields & Defaults', () => {
    test('should have correct default values', async () => {
      const user = await User.create({
        name: 'Default User',
        email: 'default@example.com',
        username: 'defaultuser',
        password: 'password',
      });

      expect(user.role).toBe('staff');
      expect(user.isSaasCustomer).toBe(false);
      expect(user.accountStatus).toBe('active');
      expect(user.subscriptionPlan).toBe('monthly');
      expect(user.active).toBe(true);
      expect(user.dateAdded).toBeDefined();
    });

    test('should store subscription details correctly', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const user = await User.create({
        name: 'SaaS User',
        email: 'saas@example.com',
        username: 'saasuser',
        password: 'password',
        isSaasCustomer: true,
        subscriptionExpiresAt: expiryDate,
      });

      expect(user.isSaasCustomer).toBe(true);
      expect(user.subscriptionExpiresAt).toBeDefined();
    });

    test('should validate role enum', async () => {
      try {
        await User.create({
          name: 'Invalid Role',
          email: 'invalid@example.com',
          username: 'invalid',
          password: 'password',
          role: 'invalid_role',
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should validate accountStatus enum', async () => {
      try {
        await User.create({
          name: 'Invalid Status',
          email: 'status@example.com',
          username: 'statususer',
          password: 'password',
          accountStatus: 'invalid_status',
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // ==================== TENANT TESTS ====================

  describe('Tenant & Workspace', () => {
    test('should store tenant key and workspace host', async () => {
      const user = await User.create({
        name: 'Tenant User',
        email: 'tenant@example.com',
        username: 'tenantuser',
        password: 'password',
        tenantKey: 'tenant-123',
        workspaceHost: 'workspace.example.com',
      });

      expect(user.tenantKey).toBe('tenant-123');
      expect(user.workspaceHost).toBe('workspace.example.com');
    });

    test('should lowercase workspace host', async () => {
      const user = await User.create({
        name: 'Host User',
        email: 'host@example.com',
        username: 'hostuser',
        password: 'password',
        workspaceHost: 'WORKSPACE.EXAMPLE.COM',
      });

      expect(user.workspaceHost).toBe('workspace.example.com');
    });
  });

  // ==================== OTP TESTS ====================

  describe('OTP Fields', () => {
    test('should initialize OTP as null', async () => {
      const user = await User.create({
        name: 'OTP User',
        email: 'otp@example.com',
        username: 'otpuser',
        password: 'password',
      });

      const foundUser = await User.findById(user._id);
      expect(foundUser.otp.code).toBeUndefined();
    });

    test('should store OTP with code and expiration', async () => {
      const user = await User.create({
        name: 'OTP Storage',
        email: 'otpstorage@example.com',
        username: 'otpstorage',
        password: 'password',
      });

      user.otp = {
        code: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };
      await user.save();

      const foundUser = await User.findById(user._id);
      expect(foundUser.otp.code).toBe('123456');
      expect(foundUser.otp.expiresAt).toBeDefined();
    });
  });

  // ==================== QUERY TESTS ====================

  describe('User Queries', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Owner User',
        email: 'owner@example.com',
        username: 'owneruser',
        password: 'password',
        role: 'owner',
        tenantKey: 'tenant-1',
      });

      await User.create({
        name: 'Manager User',
        email: 'manager@example.com',
        username: 'manageruser',
        password: 'password',
        role: 'manager',
        tenantKey: 'tenant-1',
      });
    });

    test('should find user by email', async () => {
      const user = await User.findOne({ email: 'owner@example.com' });
      expect(user).toBeDefined();
      expect(user.role).toBe('owner');
    });

    test('should find user by tenant and role', async () => {
      const user = await User.findOne({
        tenantKey: 'tenant-1',
        role: 'owner',
      });
      expect(user).toBeDefined();
      expect(user.name).toBe('Owner User');
    });

    test('should find multiple users by tenant', async () => {
      const users = await User.find({ tenantKey: 'tenant-1' });
      expect(users.length).toBe(2);
    });

    test('should exclude password from queries', async () => {
      const user = await User.findOne({ email: 'owner@example.com' }).select('-password');
      expect(user.password).toBeUndefined();
    });
  });

  // ==================== UPDATE TESTS ====================

  describe('User Updates', () => {
    test('should update user fields', async () => {
      let user = await User.create({
        name: 'Original Name',
        email: 'update@example.com',
        username: 'updateuser',
        password: 'password',
      });

      user.name = 'Updated Name';
      user.accountStatus = 'frozen';
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.accountStatus).toBe('frozen');
    });

    test('should update subscription expiry', async () => {
      const user = await User.create({
        name: 'Sub User',
        email: 'subuser@example.com',
        username: 'subuser',
        password: 'password',
        isSaasCustomer: true,
      });

      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 60);
      user.subscriptionExpiresAt = newExpiry;
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.subscriptionExpiresAt).toBeDefined();
    });
  });

  // ==================== DELETION TESTS ====================

  describe('User Deletion', () => {
    test('should delete user by id', async () => {
      const user = await User.create({
        name: 'Delete User',
        email: 'delete@example.com',
        username: 'deleteuser',
        password: 'password',
      });

      await User.deleteOne({ _id: user._id });
      const deleted = await User.findById(user._id);
      expect(deleted).toBeNull();
    });
  });
});
