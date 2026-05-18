const mongoose = require("mongoose");

// Fix user indexes: repair stale unique indexes that block staff inserts.
const fixUserIndexes = async (retries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not ready");
      }

      const collection = db.collection("users");
      const indexes = await collection.getIndexes();

      console.log(`\n🔧 Attempting to fix user indexes (attempt ${attempt}/${retries})...`);

      const ensureSparseUniqueIndex = async (indexName, keyDefinition, label) => {
        const currentIndex = indexes[indexName];

        const matchesDesiredShape =
          currentIndex &&
          currentIndex.unique === true &&
          currentIndex.sparse === true;

        if (matchesDesiredShape) {
          console.log(`   ✅ ${label} index already sparse + unique`);
          return;
        }

        if (currentIndex) {
          console.log(`   Dropping stale ${label} index: ${indexName}`);
          try {
            await collection.dropIndex(indexName);
            console.log(`   ✅ Dropped ${indexName} index`);
          } catch (dropErr) {
            console.log(`   ℹ️  Could not drop ${indexName}: ${dropErr.message}`);
          }
        } else {
          console.log(`   ℹ️  ${label} index not found, creating it`);
        }

        await collection.createIndex(keyDefinition, { unique: true, sparse: true });
        console.log(`   ✅ Ensured sparse unique ${label} index`);
      };

      await ensureSparseUniqueIndex("username_1", { username: 1 }, "username");
      await ensureSparseUniqueIndex("email_1", { email: 1 }, "email");

      // Check if compound index exists
      const hasCompoundIndex = Object.keys(indexes).some(
        key => {
          const indexKey = JSON.stringify(indexes[key].key);
          return indexKey.includes('tenantKey') && indexKey.includes('username');
        }
      );

      if (!hasCompoundIndex) {
        console.log("   Creating compound unique index: { tenantKey, username }");
        try {
          await collection.createIndex(
            { tenantKey: 1, username: 1 },
            { unique: true, sparse: true }
          );
          console.log("   ✅ Created compound index");
        } catch (createErr) {
          console.log(`   ℹ️  Could not create compound index: ${createErr.message}`);
        }
      } else {
        console.log("   ✅ Compound index already exists");
      }

      console.log("✅ User indexing configured successfully!");
      console.log("   Same username allowed across different workspaces");
      return true; // Success
    } catch (error) {
      lastError = error;
      console.warn(`   ❌ Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < retries) {
        console.log(`   ⏳ Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  
  return false;
};

const connectDB = async () => {
  try {
    // Check if MONGO_URI is set
    if (!process.env.MONGO_URI) {
      console.error("ERROR: MONGO_URI is not set in .env file!");
      console.log("Please create a .env file in the Backend directory with:");
      console.log(" MONGO_URI=mongodb://localhost:27017/biztrack");
      process.exit(1);
    }

    console.log("Attempting to connect to MongoDB...");
    console.log(`Connection String: ${process.env.MONGO_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options help with connection stability
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log("MongoDB Connected Successfully!");
    console.log(`Database: ${conn.connection.name}`);
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Port: ${conn.connection.port}`);
    
    // Drop old global username index immediately (synchronously) before app starts
    // This must run before Mongoose autoIndex re-creates it
    console.log("\n🔍 Checking and fixing username indexes...");
    await fixUserIndexes();
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn("MongoDB disconnected");
    });

    mongoose.connection.on('reconnected', () => {
      console.log(" MongoDB reconnected");
    });

  } catch (error) {
    console.error("MongoDB connection failed!");
    console.error("Error details:", error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.error("\n Possible issues:");
      console.error("   - MongoDB server is not running");
      console.error("   - Incorrect hostname in MONGO_URI");
    } else if (error.message.includes('authentication failed')) {
      console.error("\n Possible issues:");
      console.error("   - Incorrect username or password");
      console.error("   - User doesn't have access to the database");
    } else if (error.message.includes('timeout')) {
      console.error("\n Possible issues:");
      console.error("   - MongoDB server is not accessible");
      console.error("   - Firewall blocking the connection");
      console.error("   - Network connectivity issues");
    }
    
    console.error("\n📖 Please check the setup guide in README_SETUP.md");
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.fixUserIndexes = fixUserIndexes;
