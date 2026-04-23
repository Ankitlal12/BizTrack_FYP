require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function setSubscriptionExpiringSoon() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    // Find all owners
    const owners = await User.find({ role: 'owner', isSaasCustomer: true });
    console.log(`📊 Found ${owners.length} SaaS owner(s)\n`);

    if (owners.length === 0) {
      console.log('❌ No SaaS owners found');
      await mongoose.connection.close();
      return;
    }

    // Set subscription to expire in 2 days for the first owner
    const owner = owners[0];
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    console.log(`🔧 Updating subscription for: ${owner.email}`);
    console.log(`   Current expiry: ${owner.subscriptionExpiresAt}`);
    console.log(`   New expiry: ${twoDaysFromNow}`);

    owner.subscriptionExpiresAt = twoDaysFromNow;
    owner.accountStatus = 'active';
    owner.active = true;
    await owner.save();

    console.log(`\n✅ Updated! Subscription now expires in 2 days.`);
    console.log(`   Owner: ${owner.name} (${owner.email})`);
    console.log(`   Expiry: ${twoDaysFromNow.toLocaleString()}`);
    console.log(`\n💡 Log out and log back in to see the subscription banner!`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setSubscriptionExpiringSoon();
