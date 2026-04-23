require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const SaasSignup = require('../models/SaasSignup');

async function listAndDeleteUsers() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    // List all users
    const allUsers = await User.find({}).select('email role accountStatus tenantKey');
    console.log(`📊 Found ${allUsers.length} total user(s):\n`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role}) - Status: ${user.accountStatus || 'active'}`);
    });

    // Find users with ankitlal067 in email
    const matchingUsers = await User.find({ 
      email: { $regex: 'ankitlal067', $options: 'i' } 
    });

    if (matchingUsers.length === 0) {
      console.log('\n❌ No users found with "ankitlal067" in email');
      await mongoose.connection.close();
      return;
    }

    console.log(`\n🎯 Found ${matchingUsers.length} matching user(s):\n`);

    for (const user of matchingUsers) {
      console.log(`Deleting: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Tenant: ${user.tenantKey || 'N/A'}`);

      // Delete team members if owner
      if (user.role === 'owner' && user.tenantKey) {
        const teamMembers = await User.deleteMany({ 
          tenantKey: user.tenantKey, 
          _id: { $ne: user._id } 
        });
        console.log(`🗑️ Deleted ${teamMembers.deletedCount} team member(s)`);
      }

      // Delete the user
      await User.findByIdAndDelete(user._id);
      console.log(`✅ Deleted user: ${user.email}`);

      // Clean up SaasSignup records
      const signupsDeleted = await SaasSignup.deleteMany({ 
        $or: [
          { ownerUserId: user._id },
          { email: user.email }
        ]
      });
      console.log(`🗑️ Deleted ${signupsDeleted.deletedCount} signup record(s)\n`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

listAndDeleteUsers();
