/**
 * Migration Script: Update all existing subscriptions to 10-day period
 * 
 * This script updates all existing owner accounts to have a 10-day subscription
 * starting from their last payment date (or now if no payment date exists)
 * 
 * Run with: node scripts/updateSubscriptionTo10Days.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const SUBSCRIPTION_DAYS = 10;

async function updateSubscriptions() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    // Find all owner accounts
    const owners = await User.find({ role: 'owner', isSaasCustomer: true });
    console.log(`\n📊 Found ${owners.length} SaaS owner account(s)\n`);

    if (owners.length === 0) {
      console.log('ℹ️  No SaaS owners found. Nothing to update.');
      await mongoose.connection.close();
      return;
    }

    let updatedCount = 0;

    for (const owner of owners) {
      const oldExpiry = owner.subscriptionExpiresAt;
      const lastPaid = owner.subscriptionLastPaidAt || new Date();
      
      // Calculate new expiry: last payment date + 10 days
      const newExpiry = new Date(lastPaid);
      newExpiry.setDate(newExpiry.getDate() + SUBSCRIPTION_DAYS);

      // Update the owner
      owner.subscriptionExpiresAt = newExpiry;
      await owner.save();

      updatedCount++;

      console.log(`✅ Updated: ${owner.email}`);
      console.log(`   Old Expiry: ${oldExpiry ? oldExpiry.toLocaleDateString() : 'None'}`);
      console.log(`   New Expiry: ${newExpiry.toLocaleDateString()}`);
      console.log(`   Days from now: ${Math.ceil((newExpiry - new Date()) / (1000 * 60 * 60 * 24))} days\n`);
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} account(s) to 10-day subscription period`);
    console.log('✅ Migration complete!\n');

    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the migration
updateSubscriptions();
