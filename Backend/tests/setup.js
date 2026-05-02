// Test Setup File
// This file runs before all tests to configure the test environment

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Mock environment variables if needed
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.WORKSPACE_TENANT_KEY = 'test-tenant-key';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

// Start in-memory MongoDB server before all tests
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    console.log('✓ In-memory MongoDB server started');
  } catch (error) {
    console.error('✗ Failed to start in-memory MongoDB:', error);
    throw error;
  }
});

// Stop in-memory MongoDB server after all tests
afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
    console.log('✓ In-memory MongoDB server stopped');
  }
});

// Global test timeout
jest.setTimeout(30000);
