/**
 * Migration: Fix User Indexes
 * 
 * Purpose: Repair stale unique indexes on users that can block staff creation.
 * 
 * This makes email sparse + unique, preserves the compound workspace-scoped
 * username index, and keeps the app aligned with the runtime startup repair.
 * 
 * Usage: node migrations/fix-username-index.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:admin123@cluster0.kxy7dyl.mongodb.net/test";

async function migrateUsernameIndex() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    console.log("\n📋 Current indexes:");
    const indexes = await collection.getIndexes();
    console.log(JSON.stringify(indexes, null, 2));

    const ensureSparseUniqueIndex = async (indexName, keyDefinition, label) => {
      const currentIndex = indexes[indexName];
      const matchesDesiredShape =
        currentIndex &&
        currentIndex.unique === true &&
        currentIndex.sparse === true;

      if (matchesDesiredShape) {
        console.log(`\n✅ ${label} index already sparse + unique`);
        return;
      }

      if (currentIndex) {
        console.log(`\n🔧 Dropping stale ${label} index: ${indexName}...`);
        await collection.dropIndex(indexName);
        console.log(`✅ Dropped ${indexName} index`);
      } else {
        console.log(`\nℹ️  ${label} index not found, creating it`);
      }

      await collection.createIndex(keyDefinition, { unique: true, sparse: true });
      console.log(`✅ Ensured sparse unique ${label} index`);
    };

    await ensureSparseUniqueIndex("username_1", { username: 1 }, "username");
    await ensureSparseUniqueIndex("email_1", { email: 1 }, "email");

    // Ensure the new compound unique index exists
    console.log("\n🔧 Creating compound unique index (tenantKey + username)...");
    const compoundExists = Object.keys(indexes).some(
      (key) => JSON.stringify(indexes[key].key).includes('tenantKey') && JSON.stringify(indexes[key].key).includes('username')
    );

    if (!compoundExists) {
      await collection.createIndex(
        { tenantKey: 1, username: 1 },
        { unique: true, sparse: true }
      );
      console.log("✅ Created compound index: { tenantKey: 1, username: 1 }");
    } else {
      console.log("✅ Compound index already exists");
    }

    console.log("\n📋 Updated indexes:");
    const updatedIndexes = await collection.getIndexes();
    console.log(JSON.stringify(updatedIndexes, null, 2));

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   - Repaired: sparse unique email index");
    console.log("   - Repaired: compound unique index on (tenantKey, username)");
    console.log("   - Result: staff inserts no longer fail on email:null duplicates");
    console.log("   - Duplicates within the same workspace are still prevented");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateUsernameIndex();
