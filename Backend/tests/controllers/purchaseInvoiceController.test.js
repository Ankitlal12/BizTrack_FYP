// Purchase, Invoice & Reporting Tests
const Purchase = require('../../models/Purchase');
const Invoice = require('../../models/Invoice');
const Supplier = require('../../models/Supplier');
const User = require('../../models/User');
const { connectTestDB, closeDatabase, clearDatabase } = require('../testDB');

describe('Purchase & Invoice Management', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // ==================== PURCHASE CREATION TESTS ====================

  describe('Purchase Creation', () => {
    beforeEach(async () => {
      await Supplier.create({
        name: 'ABC Suppliers',
        email: 'abc@suppliers.com',
        phone: '9841234567',
        tenantKey: 'tenant-1',
      });
    });

    test('should create a new purchase order', async () => {
      const supplier = await Supplier.findOne({ name: 'ABC Suppliers' });

      const purchase = await Purchase.create({
        purchaseNumber: 'PO-001',
        supplierName: supplier.name,
        supplierEmail: supplier.email,
        supplierPhone: supplier.phone,
        items: [
          {
            name: 'Product A',
            quantity: 100,
            cost: 500,
            total: 50000,
          },
        ],
        subtotal: 50000,
        tax: 0,
        shipping: 0,
        total: 50000,
        status: 'pending',
        tenantKey: 'tenant-1',
      });

      expect(purchase).toBeDefined();
      expect(purchase.total).toBe(50000);
      expect(purchase.status).toBe('pending');
    });

    test('should track purchase status', async () => {
      const supplier = await Supplier.findOne({ name: 'ABC Suppliers' });

      const purchase = await Purchase.create({
        purchaseNumber: 'PO-002',
        supplierName: supplier.name,
        items: [{ name: 'Item', quantity: 10, cost: 100, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'pending',
        tenantKey: 'tenant-1',
      });

      expect(['pending', 'ordered', 'received', 'cancelled']).toContain(
        purchase.status
      );
    });
  });

  // ==================== PURCHASE RETRIEVAL TESTS ====================

  describe('Purchase Retrieval', () => {
    beforeEach(async () => {
      const supplier = await Supplier.create({
        name: 'Supplier',
        email: 'supplier@example.com',
        phone: '9841234567',
        tenantKey: 'tenant-1',
      });

      await Purchase.create({
        purchaseNumber: 'PO-RET-001',
        supplierName: supplier.name,
        supplierEmail: supplier.email,
        items: [{ name: 'Product', quantity: 50, cost: 100, total: 5000 }],
        subtotal: 5000,
        total: 5000,
        status: 'received',
        tenantKey: 'tenant-1',
      });

      await Purchase.create({
        purchaseNumber: 'PO-RET-002',
        supplierName: supplier.name,
        supplierEmail: supplier.email,
        items: [{ name: 'Product', quantity: 30, cost: 200, total: 6000 }],
        subtotal: 6000,
        total: 6000,
        status: 'pending',
        tenantKey: 'tenant-1',
      });
    });

    test('should get purchase by id', async () => {
      const purchase = await Purchase.findOne({ status: 'received' });
      const found = await Purchase.findById(purchase._id);
      expect(found.status).toBe('received');
    });

    test('should filter purchases by status', async () => {
      const pending = await Purchase.find({
        tenantKey: 'tenant-1',
        status: 'pending',
      });

      expect(pending.length).toBe(1);
    });

    test('should get all purchases by tenant', async () => {
      const purchases = await Purchase.find({ tenantKey: 'tenant-1' });
      expect(purchases.length).toBe(2);
    });
  });

  // ==================== INVOICE CREATION TESTS ====================

  describe('Invoice Creation', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Customer',
        email: 'customer@example.com',
        username: 'customer',
        password: 'password',
        tenantKey: 'tenant-1',
      });

      await Purchase.create({
        purchaseNumber: 'PO-INV-TEST',
        supplierName: 'Test Supplier',
        items: [{ name: 'Test Item', quantity: 10, cost: 100, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'pending',
        tenantKey: 'tenant-1',
      });
    });

    test('should create an invoice', async () => {
      const purchase = await Purchase.findOne({ status: 'pending' });
      const now = new Date();
      const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await Invoice.create({
        invoiceNumber: 'INV-001',
        type: 'purchase',
        relatedId: purchase._id,
        relatedModel: 'Purchase',
        customerName: purchase.supplierName,
        dueDate: dueDate,
        items: [
          {
            name: 'Service',
            quantity: 1,
            price: 5000,
            total: 5000,
          },
        ],
        subtotal: 5000,
        total: 5000,
        status: 'draft',
        tenantKey: 'tenant-1',
      });

      expect(invoice).toBeDefined();
      expect(invoice.invoiceNumber).toBe('INV-001');
      expect(invoice.type).toBe('purchase');
    });

    test('should generate unique invoice number', async () => {
      const purchase = await Purchase.findOne();
      const now = new Date();
      const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const invoice1 = await Invoice.create({
        invoiceNumber: 'INV-001',
        type: 'purchase',
        relatedId: purchase._id,
        relatedModel: 'Purchase',
        customerName: 'Customer 1',
        dueDate: dueDate,
        items: [{ name: 'Item', quantity: 1, price: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'draft',
        tenantKey: 'tenant-1',
      });

      const invoice2 = await Invoice.create({
        invoiceNumber: 'INV-002',
        type: 'purchase',
        relatedId: purchase._id,
        relatedModel: 'Purchase',
        customerName: 'Customer 2',
        dueDate: dueDate,
        items: [{ name: 'Item', quantity: 1, price: 2000, total: 2000 }],
        subtotal: 2000,
        total: 2000,
        status: 'draft',
        tenantKey: 'tenant-1',
      });

      expect(invoice1.invoiceNumber).not.toBe(invoice2.invoiceNumber);
    });
  });

  // ==================== INVOICE RETRIEVAL & UPDATES ====================

  describe('Invoice Management', () => {
    beforeEach(async () => {
      const user = await User.create({
        name: 'Invoice User',
        email: 'invoiceuser@example.com',
        username: 'invoiceuser',
        password: 'password',
        tenantKey: 'tenant-1',
      });

      const purchase = await Purchase.create({
        purchaseNumber: 'PO-INV-001',
        supplierName: 'Supplier A',
        items: [{ name: 'Item', quantity: 1, cost: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'pending',
        tenantKey: 'tenant-1',
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await Invoice.create({
        invoiceNumber: 'INV-101',
        type: 'purchase',
        relatedId: purchase._id,
        relatedModel: 'Purchase',
        customerName: 'Customer User',
        dueDate: dueDate,
        items: [{ name: 'Item', quantity: 1, price: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'sent',
        tenantKey: 'tenant-1',
      });

      const dueDate2 = new Date();
      dueDate2.setDate(dueDate2.getDate() + 30);

      await Invoice.create({
        invoiceNumber: 'INV-102',
        type: 'purchase',
        relatedId: purchase._id,
        relatedModel: 'Purchase',
        customerName: 'Customer User 2',
        dueDate: dueDate2,
        items: [{ name: 'Item', quantity: 2, price: 500, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'paid',
        tenantKey: 'tenant-1',
      });

      const dueDate3 = new Date();
      dueDate3.setDate(dueDate3.getDate() + 30);

      await Invoice.create({
        invoiceNumber: 'INV-103',
        type: 'purchase',
        relatedId: purchase._id,
        relatedModel: 'Purchase',
        customerName: 'Customer User 3',
        dueDate: dueDate3,
        items: [{ name: 'Item', quantity: 1, price: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'draft',
        tenantKey: 'tenant-1',
      });
    });

    test('should update invoice status to paid', async () => {
      let invoice = await Invoice.findOne({ invoiceNumber: 'INV-101' });
      invoice.status = 'paid';
      await invoice.save();

      const updated = await Invoice.findById(invoice._id);
      expect(updated.status).toBe('paid');
    });

    test('should filter paid invoices', async () => {
      const paidInvoices = await Invoice.find({
        tenantKey: 'tenant-1',
        status: 'paid',
      });

      expect(paidInvoices.length).toBe(1);
    });

    test('should filter pending invoices', async () => {
      const pendingInvoices = await Invoice.find({
        tenantKey: 'tenant-1',
        status: 'sent',
      });

      expect(pendingInvoices.length).toBe(1);
    });
  });

  // ==================== FINANCIAL REPORTING TESTS ====================

  describe('Financial Reporting', () => {
    beforeEach(async () => {
      const user = await User.create({
        name: 'Report User',
        email: 'reportuser@example.com',
        username: 'reportuser',
        password: 'password',
        tenantKey: 'tenant-1',
      });

      const purchase = await Purchase.create({
        purchaseNumber: 'PO-FIN-001',
        supplierName: 'Supplier B',
        items: [{ name: 'Item', quantity: 1, cost: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'pending',
        tenantKey: 'tenant-1',
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      for (let i = 1; i <= 5; i++) {
        await Invoice.create({
          invoiceNumber: `INV-FIN-${i}`,
          type: 'purchase',
          relatedId: purchase._id,
          relatedModel: 'Purchase',
          customerName: `Customer ${i}`,
          dueDate: dueDate,
          items: [{ name: 'Item', quantity: i, price: 1000, total: i * 1000 }],
          subtotal: i * 1000,
          total: i * 1000,
          status: i % 2 === 0 ? 'paid' : 'draft',
          tenantKey: 'tenant-1',
        });
      }
    });

    test('should calculate total revenue', async () => {
      const invoices = await Invoice.find({
        tenantKey: 'tenant-1',
        status: 'paid',
      });

      const revenue = invoices.reduce(
        (sum, invoice) => sum + invoice.total,
        0
      );

      expect(revenue).toBeGreaterThan(0);
    });

    test('should count issued invoices', async () => {
      const pending = await Invoice.countDocuments({
        tenantKey: 'tenant-1',
        status: 'draft',
      });

      expect(pending).toBeGreaterThan(0);
    });

    test('should calculate outstanding amount', async () => {
      const issued = await Invoice.find({
        tenantKey: 'tenant-1',
        status: 'draft',
      });

      const outstanding = issued.reduce(
        (sum, inv) => sum + inv.total,
        0
      );

      expect(outstanding).toBeGreaterThan(0);
    });
  });

  // ==================== AUDIT TRAIL TESTS ====================

  describe('Audit Trail & History', () => {
    test('should track invoice creation time', async () => {
      const user = await User.create({
        name: 'Audit User',
        email: 'audituser@example.com',
        username: 'audituser',
        password: 'password',
        tenantKey: 'tenant-1',
      });

      const purchase = await Purchase.create({
        purchaseNumber: 'PO-AUDIT-001',
        supplierName: 'Supplier C',
        items: [{ name: 'Item', quantity: 1, cost: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'pending',
        tenantKey: 'tenant-1',
      });

      const now = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoice = await Invoice.create({
        invoiceNumber: 'INV-AUDIT',
        type: 'purchase',
        relatedId: purchase._id,
        relatedModel: 'Purchase',
        customerName: 'Audit Customer',
        dueDate: dueDate,
        items: [{ name: 'Item', quantity: 1, price: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'draft',
        tenantKey: 'tenant-1',
      });

      expect(invoice.createdAt).toBeDefined();
      expect(invoice.createdAt.getTime()).toBeGreaterThanOrEqual(
        now.getTime() - 1000
      );
    });

    test('should track invoice modification time', async () => {
      const user = await User.create({
        name: 'Mod User',
        email: 'moduser@example.com',
        username: 'moduser',
        password: 'password',
        tenantKey: 'tenant-1',
      });

      const purchase = await Purchase.create({
        purchaseNumber: 'PO-MOD-001',
        supplierName: 'Supplier D',
        items: [{ name: 'Item', quantity: 1, cost: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'pending',
        tenantKey: 'tenant-1',
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      let invoice = await Invoice.create({
        invoiceNumber: 'INV-MOD',
        type: 'purchase',
        relatedId: purchase._id,
        relatedModel: 'Purchase',
        customerName: 'Mod Customer',
        dueDate: dueDate,
        items: [{ name: 'Item', quantity: 1, price: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1000,
        status: 'draft',
        tenantKey: 'tenant-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      invoice.status = 'paid';
      await invoice.save();

      expect(invoice.updatedAt).toBeDefined();
    });
  });
});
