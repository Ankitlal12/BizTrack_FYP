// User Controller Tests
const User = require('../../models/User');
const { connectTestDB, closeDatabase, clearDatabase } = require('../testDB');
const { generateToken, verifyToken } = require('../../utils/jwt');

describe('User Controller - Core Functions', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // ==================== USER CREATION TESTS ====================

  describe('User Creation', () => {
    test('should create a new staff user', async () => {
      const userData = {
        name: 'New Staff',
        email: 'newstaff@example.com',
        username: 'newstaff',
        password: 'hashedPassword123',
        role: 'staff',
        tenantKey: 'tenant-1',
      };

      const user = await User.create(userData);
      expect(user).toBeDefined();
      expect(user.email).toBe('newstaff@example.com');
      expect(user.role).toBe('staff');
    });

    test('should create owner user', async () => {
      const userData = {
        name: 'New Owner',
        email: 'newowner@example.com',
        username: 'newowner',
        password: 'ownerPassword123',
        role: 'owner',
        tenantKey: 'tenant-new',
      };

      const user = await User.create(userData);
      expect(user.role).toBe('owner');
      expect(user.tenantKey).toBe('tenant-new');
    });

    test('should fail with invalid email', async () => {
      try {
        await User.create({
          name: 'Bad Email',
          email: 'notanemail',
          username: 'bademail',
          password: 'password',
        });
        fail('Should have thrown error for invalid email');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should prevent duplicate email', async () => {
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
        fail('Should have thrown duplicate error');
      } catch (error) {
        expect(error.code).toBe(11000);
      }
    });
  });

  // ==================== USER RETRIEVAL TESTS ====================

  describe('User Retrieval', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Findable User',
        email: 'find@example.com',
        username: 'findable',
        password: 'password',
        role: 'staff',
        tenantKey: 'tenant-1',
      });

      await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        username: 'admin',
        password: 'password',
        role: 'admin',
      });
    });

    test('should get user by id', async () => {
      const created = await User.create({
        name: 'Get By ID',
        email: 'getbyid@example.com',
        username: 'getbyid',
        password: 'password',
      });

      const found = await User.findById(created._id);
      expect(found._id.toString()).toBe(created._id.toString());
    });

    test('should get user by email', async () => {
      const user = await User.findOne({ email: 'find@example.com' });
      expect(user.name).toBe('Findable User');
    });

    test('should return null for non-existent user', async () => {
      const user = await User.findOne({ email: 'nonexistent@example.com' });
      expect(user).toBeNull();
    });

    test('should get all users by tenant', async () => {
      const users = await User.find({ tenantKey: 'tenant-1' });
      expect(users.length).toBe(1);
      expect(users[0].name).toBe('Findable User');
    });

    test('should exclude password from queries', async () => {
      const user = await User.findOne({ email: 'find@example.com' }).select('-password');
      expect(user.password).toBeUndefined();
    });
  });

  // ==================== USER UPDATE TESTS ====================

  describe('User Update', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Original Name',
        email: 'update@example.com',
        username: 'updateuser',
        password: 'password',
        role: 'staff',
        tenantKey: 'tenant-1',
      });
    });

    test('should update user name', async () => {
      let user = await User.findOne({ email: 'update@example.com' });
      user.name = 'Updated Name';
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.name).toBe('Updated Name');
    });

    test('should update user role', async () => {
      let user = await User.findOne({ email: 'update@example.com' });
      user.role = 'manager';
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.role).toBe('manager');
    });

    test('should update account status', async () => {
      let user = await User.findOne({ email: 'update@example.com' });
      user.accountStatus = 'frozen';
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.accountStatus).toBe('frozen');
    });

    test('should update subscription expiry', async () => {
      let user = await User.findOne({ email: 'update@example.com' });
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);
      user.subscriptionExpiresAt = newExpiry;
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.subscriptionExpiresAt).toBeDefined();
    });
  });

  // ==================== USER DELETE TESTS ====================

  describe('User Deletion', () => {
    test('should soft delete user (mark as deleted)', async () => {
      const user = await User.create({
        name: 'To Delete',
        email: 'todelete@example.com',
        username: 'todelete',
        password: 'password',
      });

      user.accountStatus = 'deleted';
      await user.save();

      const deleted = await User.findById(user._id);
      expect(deleted.accountStatus).toBe('deleted');
    });

    test('should hard delete user', async () => {
      const user = await User.create({
        name: 'Hard Delete',
        email: 'harddelete@example.com',
        username: 'harddelete',
        password: 'password',
      });

      await User.deleteOne({ _id: user._id });
      const notFound = await User.findById(user._id);
      expect(notFound).toBeNull();
    });
  });

  // ==================== GOOGLE AUTH TESTS ====================

  describe('Google Authentication', () => {
    test('should create Google user', async () => {
      const user = await User.create({
        name: 'Google User',
        email: 'googleuser@gmail.com',
        googleId: 'google_12345',
        avatar: 'https://example.com/avatar.jpg',
      });

      expect(user.googleId).toBe('google_12345');
      expect(user.password).toBeUndefined();
      expect(user.username).toBeUndefined();
    });

    test('should find user by Google ID', async () => {
      await User.create({
        name: 'Google User',
        email: 'guser@gmail.com',
        googleId: 'google_67890',
        avatar: 'https://example.com/avatar.jpg',
      });

      const user = await User.findOne({ googleId: 'google_67890' });
      expect(user).toBeDefined();
      expect(user.name).toBe('Google User');
    });
  });

  // ==================== TENANT TESTS ====================

  describe('Tenant Management', () => {
    test('should assign tenant to user', async () => {
      const user = await User.create({
        name: 'Tenant User',
        email: 'tenantuser@example.com',
        username: 'tenantuser',
        password: 'password',
        tenantKey: 'tenant-xyz',
      });

      expect(user.tenantKey).toBe('tenant-xyz');
    });

    test('should query users by tenant', async () => {
      await User.create({
        name: 'Tenant 1 User 1',
        email: 't1user1@example.com',
        username: 't1user1',
        password: 'password',
        tenantKey: 'tenant-1',
      });

      await User.create({
        name: 'Tenant 1 User 2',
        email: 't1user2@example.com',
        username: 't1user2',
        password: 'password',
        tenantKey: 'tenant-1',
      });

      await User.create({
        name: 'Tenant 2 User 1',
        email: 't2user1@example.com',
        username: 't2user1',
        password: 'password',
        tenantKey: 'tenant-2',
      });

      const tenant1Users = await User.find({ tenantKey: 'tenant-1' });
      expect(tenant1Users.length).toBe(2);
    });
  });

  // ==================== TOKEN GENERATION TESTS ====================

  describe('Token Generation', () => {
    test('should generate token for user', async () => {
      const user = await User.create({
        name: 'Token User',
        email: 'tokenuser@example.com',
        username: 'tokenuser',
        password: 'password',
      });

      const token = generateToken(user._id);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should verify generated token', async () => {
      const user = await User.create({
        name: 'Verify User',
        email: 'verifyuser@example.com',
        username: 'verifyuser',
        password: 'password',
      });

      const token = generateToken(user._id);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(user._id.toString());
    });

    test('should reject invalid token', () => {
      try {
        verifyToken('invalid.token.here');
        fail('Should have thrown error for invalid token');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
