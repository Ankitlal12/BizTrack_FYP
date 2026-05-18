const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/biztrack';

async function fixEmailIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    console.log('\n=== Checking existing indexes ===');
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Drop the problematic email index if it exists
    try {
      console.log('\n=== Dropping old email_1 index ===');
      await usersCollection.dropIndex('email_1');
      console.log('✓ Dropped email_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('✓ email_1 index does not exist (already dropped or never created)');
      } else {
        console.log('Warning: Could not drop email_1 index:', error.message);
      }
    }

    // Create the correct sparse unique index for email
    console.log('\n=== Creating new sparse unique index for email ===');
    await usersCollection.createIndex(
      { email: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'email_1_sparse'
      }
    );
    console.log('✓ Created sparse unique index for email');

    // Check for users with null emails
    console.log('\n=== Checking for users with null emails ===');
    const nullEmailUsers = await usersCollection.find({ email: null }).toArray();
    console.log(`Found ${nullEmailUsers.length} users with null email`);

    if (nullEmailUsers.length > 0) {
      console.log('\nUsers with null email:');
      nullEmailUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.role}) - Phone: ${user.phoneNumber || 'N/A'}`);
      });
    }

    // Remove email field from users where it's null (better than having null)
    console.log('\n=== Removing null email fields ===');
    const result = await usersCollection.updateMany(
      { email: null },
      { $unset: { email: "" } }
    );
    console.log(`✓ Removed email field from ${result.modifiedCount} users`);

    console.log('\n=== Verifying final indexes ===');
    const finalIndexes = await usersCollection.indexes();
    console.log('Final indexes:', JSON.stringify(finalIndexes, null, 2));

    console.log('\n✅ Email index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fixing email index:', error);
    process.exit(1);
  }
}

fixEmailIndex();
