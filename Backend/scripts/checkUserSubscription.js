require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUserSubscription() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    const email = 'lalshrestha5525@gmail.com';

    // Find the user
    const user = await User.findOne({ email: email });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      await mongoose.connection.close();
      return;
    }

    console.log('═══════════════════════════════════════════════');
    console.log('USER INFORMATION');
    console.log('═══════════════════════════════════════════════');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Username: ${user.username || 'N/A'}`);
    console.log(`Role: ${user.role}`);
    console.log(`Google ID: ${user.googleId || 'N/A'}`);
    console.log(`Tenant Key: ${user.tenantKey || 'N/A'}`);
    console.log(`Active: ${user.active}`);

    console.log('\n═══════════════════════════════════════════════');
    console.log('SUBSCRIPTION INFORMATION');
    console.log('═══════════════════════════════════════════════');
    console.log(`isSaasCustomer: ${user.isSaasCustomer}`);
    console.log(`accountStatus: ${user.accountStatus}`);
    console.log(`subscriptionPlan: ${user.subscriptionPlan || 'N/A'}`);
    console.log(`subscriptionLastPaidAt: ${user.subscriptionLastPaidAt || 'N/A'}`);
    console.log(`subscriptionExpiresAt: ${user.subscriptionExpiresAt || 'N/A'}`);

    if (user.subscriptionExpiresAt) {
      const now = new Date();
      const expiryDate = new Date(user.subscriptionExpiresAt);
      const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      const isExpired = expiryDate < now;

      console.log(`\nExpiry Date (formatted): ${expiryDate.toLocaleString()}`);
      console.log(`Days Remaining: ${daysRemaining}`);
      console.log(`Is Expired: ${isExpired ? 'YES ❌' : 'NO ✅'}`);
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('BANNER VISIBILITY CHECK');
    console.log('═══════════════════════════════════════════════');

    const checks = {
      'Has subscriptionExpiresAt': !!user.subscriptionExpiresAt,
      'Is SaaS Customer': user.isSaasCustomer === true,
      'Is Owner': user.role === 'owner',
      'Is Active': user.active === true,
    };

    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    });

    const allChecksPassed = Object.values(checks).every(v => v);

    console.log('\n═══════════════════════════════════════════════');
    if (allChecksPassed) {
      console.log('✅ BANNER SHOULD SHOW');
      console.log('═══════════════════════════════════════════════');
      console.log('\nIf banner is not showing:');
      console.log('1. User needs to LOG OUT and LOG BACK IN');
      console.log('2. Check browser console for errors');
      console.log('3. Clear localStorage and login again');
    } else {
      console.log('❌ BANNER WILL NOT SHOW');
      console.log('═══════════════════════════════════════════════');
      console.log('\nReasons:');
      Object.entries(checks).forEach(([check, passed]) => {
        if (!passed) {
          console.log(`  - ${check} is missing or false`);
        }
      });
      
      console.log('\nTo fix:');
      if (!user.isSaasCustomer) {
        console.log('  - Set isSaasCustomer to true');
      }
      if (!user.subscriptionExpiresAt) {
        console.log('  - Set subscriptionExpiresAt date');
      }
      if (user.role !== 'owner') {
        console.log('  - User must be an owner to see their own banner');
        console.log('  - Managers/staff see the owner\'s banner');
      }
    }

    // Check if there are team members
    if (user.tenantKey) {
      const teamMembers = await User.find({ 
        tenantKey: user.tenantKey, 
        _id: { $ne: user._id } 
      }).select('name email role active');

      if (teamMembers.length > 0) {
        console.log('\n═══════════════════════════════════════════════');
        console.log('TEAM MEMBERS');
        console.log('═══════════════════════════════════════════════');
        teamMembers.forEach((member, i) => {
          console.log(`${i + 1}. ${member.name} (${member.email})`);
          console.log(`   Role: ${member.role}, Active: ${member.active}`);
        });
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserSubscription();
