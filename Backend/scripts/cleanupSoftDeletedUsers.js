/**
 * Cleanup Script: Remove soft-deleted users from database
 * 
 * This script finds all users with accountStatus="deleted" and permanently
 * removes them from the database (converts soft delete to hard delete)
 * 
 * Run with: node scripts/cleanupSoftDeletedUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const SaasSignup = require('../models/SaasSignup');

async function cleanupSoftDeletes() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database\n');

    // Find all soft-deleted users
    const softDeletedUsers = await User.find({ accountStatus: "deleted" });
    console.log(`📊 Found ${softDeletedUsers.length} soft-deleted user(s)\n`);

    if (softDeletedUsers.length === 0) {
      console.log('ℹ️  No soft-deleted users found. Database is clean!');
      await mongoose.connection.close();
      return;
    }

    let totalDeleted = 0;

    for (const user of softDeletedUsers) {
      console.log(`\n🗑️  Processing: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Tenant: ${user.tenantKey || 'N/A'}`);

      // If it's an owner, delete all team members too
      if (user.role === 'owner' && user.tenantKey) {
        const teamMembers = await User.find({ 
          tenantKey: user.tenantKey, 
          _id: { $ne: user._id } 
        });
        
        if (teamMembers.length > 0) {
          console.log(`   Found ${teamMembers.length} team member(s)`);
          for (const member of teamMembers) {
            await User.findByIdAndDelete(member._id);
            console.log(`   ✅ Deleted team member: ${member.email}`);
            totalDeleted++;
          }
        }
      }

      // Delete the user
      await User.findByIdAndDelete(user._id);
      console.log(`   ✅ Deleted user: ${user.email}`);
      totalDeleted++;

      // Clean up SaasSignup records
      const signupsDeleted = await SaasSignup.deleteMany({ 
        $or: [
          { ownerUserId: user._id },
          { email: user.email }
        ]
      });
      if (signupsDeleted.deletedCount > 0) {
        console.log(`   🗑️  Deleted ${signupsDeleted.deletedCount} signup record(s)`);
      }
    }

    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   - Processed ${softDeletedUsers.length} soft-deleted user(s)`);
    console.log(`   - Permanently deleted ${totalDeleted} user(s) total`);

    // Verify cleanup
    const remaining = await User.countDocuments({ accountStatus: "deleted" });
    console.log(`   - Remaining soft-deleted users: ${remaining}`);

    if (remaining === 0) {
      console.log('\n✅ All soft-deleted users have been permanently removed!\n');
    } else {
      console.log(`\n⚠️  Warning: ${remaining} soft-deleted user(s) still remain\n`);
    }

    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the cleanup
cleanupSoftDeletes();
