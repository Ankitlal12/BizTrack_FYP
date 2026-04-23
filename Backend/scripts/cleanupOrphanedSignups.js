const mongoose = require("mongoose");
require("dotenv").config();

const SaasSignup = require("../models/SaasSignup");
const User = require("../models/User");

const cleanupOrphanedSignups = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all completed signups
    const signups = await SaasSignup.find({ 
      paymentStatus: "completed",
      ownerUserId: { $exists: true, $ne: null }
    });

    console.log(`\n📋 Found ${signups.length} completed signup(s) to check`);

    let orphanedCount = 0;
    const orphanedSignups = [];

    for (const signup of signups) {
      const user = await User.findById(signup.ownerUserId);
      
      if (!user) {
        orphanedCount++;
        orphanedSignups.push({
          email: signup.email,
          businessName: signup.businessName,
          signupId: signup._id,
          createdAt: signup.createdAt,
        });
        console.log(`❌ Orphaned signup found: ${signup.email} (User ID: ${signup.ownerUserId})`);
      }
    }

    if (orphanedCount === 0) {
      console.log("\n✅ No orphaned signups found. Database is clean!");
      await mongoose.connection.close();
      return;
    }

    console.log(`\n⚠️  Found ${orphanedCount} orphaned signup record(s)`);
    console.log("\nOrphaned signups:");
    orphanedSignups.forEach((s, i) => {
      console.log(`${i + 1}. ${s.email} - ${s.businessName} (Created: ${s.createdAt})`);
    });

    // Delete orphaned signups
    const signupIds = orphanedSignups.map(s => s.signupId);
    const result = await SaasSignup.deleteMany({ _id: { $in: signupIds } });

    console.log(`\n🗑️  Deleted ${result.deletedCount} orphaned signup record(s)`);
    console.log("✅ Cleanup completed successfully!");

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
};

cleanupOrphanedSignups();
