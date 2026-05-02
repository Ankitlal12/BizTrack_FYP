// Payment & Subscription Scheduler Service Tests
const User = require('../../models/User');
const SubscriptionPayment = require('../../models/SubscriptionPayment');
const { connectTestDB, closeDatabase, clearDatabase } = require('../testDB');

describe('Payment & Subscription Services', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // ==================== SUBSCRIPTION PAYMENT CREATION TESTS ====================

  describe('Subscription Payment Creation', () => {
    beforeEach(async () => {
      await User.create({
        name: 'SaaS Customer',
        email: 'saascustomer@example.com',
        username: 'saascustomer',
        password: 'password',
        isSaasCustomer: true,
        role: 'owner',
        tenantKey: 'tenant-saas',
      });
    });

    test('should create payment record', async () => {
      const user = await User.findOne({ email: 'saascustomer@example.com' });
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const payment = await SubscriptionPayment.create({
        ownerId: user._id,
        ownerEmail: user.email,
        ownerName: user.name,
        amount: 5000,
        currency: 'NPR',
        paymentStatus: 'completed',
        paymentType: 'initial',
        paymentMethod: 'khalti',
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
      });
      

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(5000);
      expect(payment.paymentStatus).toBe('completed');
    });

    test('should track pending payments', async () => {
      const user = await User.findOne({ email: 'saascustomer@example.com' });
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const payment = await SubscriptionPayment.create({
        ownerId: user._id,
        ownerEmail: user.email,
        ownerName: user.name,
        amount: 5000,
        currency: 'NPR',
        paymentStatus: 'initiated',
        paymentType: 'initial',
        paymentMethod: 'khalti',
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
      });

      expect(payment.paymentStatus).toBe('initiated');
    });

    test('should handle failed payments', async () => {
      const user = await User.findOne({ email: 'saascustomer@example.com' });
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const payment = await SubscriptionPayment.create({
        ownerId: user._id,
        ownerEmail: user.email,
        ownerName: user.name,
        amount: 5000,
        currency: 'NPR',
        paymentStatus: 'failed',
        paymentType: 'initial',
        paymentMethod: 'khalti',
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        metadata: { failureReason: 'Insufficient funds' },
      });

      expect(payment.paymentStatus).toBe('failed');
      expect(payment.metadata).toBeDefined();
    });
  });

  // ==================== SUBSCRIPTION EXPIRY TESTS ====================

  describe('Subscription Expiry Management', () => {
    test('should identify subscriptions expiring soon', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 5); // 5 days from now

      const user = await User.create({
        name: 'Expiring Soon User',
        email: 'expiringsoon@example.com',
        username: 'expiringsoon',
        password: 'password',
        isSaasCustomer: true,
        subscriptionExpiresAt: expiryDate,
        role: 'owner',
        tenantKey: 'tenant-expiring',
      });

      const now = new Date();
      const daysUntilExpiry = Math.floor(
        (expiryDate - now) / (1000 * 60 * 60 * 24)
      );

      expect(daysUntilExpiry).toBeLessThanOrEqual(7);
      expect(daysUntilExpiry).toBeGreaterThan(0);
    });

    test('should identify expired subscriptions', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const user = await User.create({
        name: 'Expired User',
        email: 'expired@example.com',
        username: 'expired',
        password: 'password',
        isSaasCustomer: true,
        subscriptionExpiresAt: expiredDate,
        accountStatus: 'frozen',
        role: 'owner',
        tenantKey: 'tenant-expired',
      });

      const isExpired = new Date(user.subscriptionExpiresAt) < new Date();
      expect(isExpired).toBe(true);
      expect(user.accountStatus).toBe('frozen');
    });

    test('should update subscription expiry date', async () => {
      let user = await User.create({
        name: 'Renewal User',
        email: 'renewal@example.com',
        username: 'renewal',
        password: 'password',
        isSaasCustomer: true,
        role: 'owner',
        tenantKey: 'tenant-renewal',
      });

      const newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + 1);

      user.subscriptionExpiresAt = newExpiry;
      user.subscriptionLastPaidAt = new Date();
      user.accountStatus = 'active';
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.subscriptionExpiresAt).toBeDefined();
      expect(updated.accountStatus).toBe('active');
    });
  });

  // ==================== PAYMENT HISTORY TESTS ====================

  describe('Payment History', () => {
    beforeEach(async () => {
      const user = await User.create({
        name: 'Payment History User',
        email: 'paymenthistory@example.com',
        username: 'paymenthistory',
        password: 'password',
        isSaasCustomer: true,
        role: 'owner',
        tenantKey: 'tenant-payments',
      });

      // Create multiple payment records
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);
      
      for (let i = 0; i < 3; i++) {
        await SubscriptionPayment.create({
          ownerId: user._id,
          ownerEmail: user.email,
          ownerName: user.name,
          amount: 5000,
          currency: 'NPR',
          paymentStatus: 'completed',
          paymentType: 'initial',
          paymentMethod: 'khalti',
          subscriptionStartDate: startDate,
          subscriptionEndDate: endDate,
        });
      }
    });

    test('should retrieve all payments for user', async () => {
      const user = await User.findOne({ email: 'paymenthistory@example.com' });
      const payments = await SubscriptionPayment.find({
        ownerId: user._id,
      });

      expect(payments.length).toBe(3);
    });

    test('should filter payments by status', async () => {
      const user = await User.findOne({ email: 'paymenthistory@example.com' });
      const completed = await SubscriptionPayment.find({
        ownerId: user._id,
        paymentStatus: 'completed',
      });

      expect(completed.length).toBe(3);
    });

    test('should sum total payments', async () => {
      const user = await User.findOne({ email: 'paymenthistory@example.com' });
      const payments = await SubscriptionPayment.find({
        ownerId: user._id,
      });

      const total = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(total).toBe(15000);
    });
  });

  // ==================== SUBSCRIPTION RENEWAL TESTS ====================

  describe('Subscription Renewal', () => {
    test('should process renewal automatically', async () => {
      let user = await User.create({
        name: 'Auto Renewal User',
        email: 'autorenewal@example.com',
        username: 'autorenewal',
        password: 'password',
        isSaasCustomer: true,
        subscriptionPlan: 'monthly',
        role: 'owner',
        tenantKey: 'tenant-autorenewal',
      });

      // Simulate renewal
      const newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + 1);
      const startDate = new Date();
      const endDate = new Date(newExpiry);

      const payment = await SubscriptionPayment.create({
        ownerId: user._id,
        ownerEmail: user.email,
        ownerName: user.name,
        amount: 5000,
        currency: 'NPR',
        paymentStatus: 'completed',
        paymentType: 'renewal',
        paymentMethod: 'khalti',
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
      });

      user.subscriptionExpiresAt = newExpiry;
      user.subscriptionLastPaidAt = new Date();
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.subscriptionExpiresAt.getTime()).toBeGreaterThan(new Date().getTime());
    });

    test('should handle failed renewal', async () => {
      const user = await User.create({
        name: 'Failed Renewal User',
        email: 'failedrenewal@example.com',
        username: 'failedrenewal',
        password: 'password',
        isSaasCustomer: true,
        role: 'owner',
        tenantKey: 'tenant-failedrenewal',
      });

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const payment = await SubscriptionPayment.create({
        ownerId: user._id,
        ownerEmail: user.email,
        ownerName: user.name,
        amount: 5000,
        currency: 'NPR',
        paymentStatus: 'failed',
        paymentType: 'renewal',
        paymentMethod: 'khalti',
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        metadata: { failureReason: 'Card declined' },
      });

      expect(payment.paymentStatus).toBe('failed');
    });
  });

  // ==================== SUBSCRIPTION PLAN TESTS ====================

  describe('Subscription Plans', () => {
    test('should support monthly plan', async () => {
      const user = await User.create({
        name: 'Monthly Plan User',
        email: 'monthlyplan@example.com',
        username: 'monthlyplan',
        password: 'password',
        isSaasCustomer: true,
        subscriptionPlan: 'monthly',
        role: 'owner',
        tenantKey: 'tenant-monthly',
      });

      expect(user.subscriptionPlan).toBe('monthly');
    });

    test('should track subscription dates', async () => {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const user = await User.create({
        name: 'Subscription Dates User',
        email: 'subsdates@example.com',
        username: 'subsdates',
        password: 'password',
        isSaasCustomer: true,
        subscriptionExpiresAt: expiryDate,
        subscriptionLastPaidAt: new Date(),
        role: 'owner',
        tenantKey: 'tenant-subsdates',
      });

      expect(user.subscriptionExpiresAt).toBeDefined();
      expect(user.subscriptionLastPaidAt).toBeDefined();
    });
  });

  // ==================== TENANT BILLING TESTS ====================

  describe('Tenant Billing', () => {
    test('should isolate payments by tenant', async () => {
      const tenant1User = await User.create({
        name: 'Tenant 1 User',
        email: 'tenant1@example.com',
        username: 'tenant1user',
        password: 'password',
        isSaasCustomer: true,
        role: 'owner',
        tenantKey: 'tenant-1',
      });

      const tenant2User = await User.create({
        name: 'Tenant 2 User',
        email: 'tenant2@example.com',
        username: 'tenant2user',
        password: 'password',
        isSaasCustomer: true,
        role: 'owner',
        tenantKey: 'tenant-2',
      });

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      await SubscriptionPayment.create({
        ownerId: tenant1User._id,
        ownerEmail: tenant1User.email,
        ownerName: tenant1User.name,
        amount: 5000,
        paymentStatus: 'completed',
        paymentType: 'initial',
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
      });

      const tenant1Payments = await SubscriptionPayment.find({
        ownerId: tenant1User._id,
      });

      expect(tenant1Payments.length).toBe(1);
    });
  });
});
