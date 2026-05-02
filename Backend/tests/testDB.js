// Database Test Utilities
const mongoose = require('mongoose');

/**
 * Connect to test database
 */
const connectTestDB = async () => {
  try {
    // Use the MONGODB_URI set by setup.js (in-memory server)
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
    }
    console.log('✓ Test database connected');
  } catch (error) {
    console.error('✗ Failed to connect to test database:', error.message);
    throw error;
  }
};

/**
 * Disconnect from test database
 */
const disconnectTestDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    console.log('✓ Test database disconnected');
  } catch (error) {
    console.error('✗ Failed to disconnect from test database:', error.message);
    throw error;
  }
};

/**
 * Clear all collections in database
 */
const clearDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('✗ Failed to clear database:', error.message);
    throw error;
  }
};

/**
 * Close all connections and clear database
 */
const closeDatabase = async () => {
  try {
    await clearDatabase();
    await disconnectTestDB();
  } catch (error) {
    console.error('✗ Failed to close database:', error.message);
    throw error;
  }
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  closeDatabase,
};
