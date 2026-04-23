/**
 * Safe duplicate-payment cleanup by pidx.
 *
 * Default mode is DRY-RUN (no deletion).
 *
 * Usage:
 *   node scripts/removeDuplicatePayments.js
 *   node scripts/removeDuplicatePayments.js --apply
 *   node scripts/removeDuplicatePayments.js --apply --pidx=<khalti_pidx>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionPayment = require('../models/SubscriptionPayment');

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const pidxArg = args.find((arg) => arg.startsWith('--pidx='));
const targetPidx = pidxArg ? pidxArg.split('=')[1] : null;

const statusPriority = {
  completed: 3,
  initiated: 2,
  failed: 1,
};

const selectRecordToKeep = (records) => {
  return [...records].sort((a, b) => {
    const byStatus = (statusPriority[b.paymentStatus] || 0) - (statusPriority[a.paymentStatus] || 0);
    if (byStatus !== 0) return byStatus;

    const byCreated = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (byCreated !== 0) return byCreated;

    return String(a._id).localeCompare(String(b._id));
  })[0];
};

async function removeDuplicates() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing. Configure Backend/.env before running cleanup.');
    }

    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const findFilter = targetPidx ? { pidx: targetPidx } : {};
    const allPayments = await SubscriptionPayment.find(findFilter).sort({ createdAt: 1 });
    console.log(`Total records scanned: ${allPayments.length}`);

    if (allPayments.length === 0) {
      console.log('No payment records found for the selected scope.');
      await mongoose.connection.close();
      return;
    }

    const paymentsByPidx = new Map();
    for (const payment of allPayments) {
      if (!payment.pidx) continue;
      const bucket = paymentsByPidx.get(payment.pidx) || [];
      bucket.push(payment);
      paymentsByPidx.set(payment.pidx, bucket);
    }

    let duplicateGroups = 0;
    let totalDuplicates = 0;
    const deleteIds = [];

    for (const [pidx, records] of paymentsByPidx.entries()) {
      if (records.length <= 1) continue;

      duplicateGroups += 1;
      totalDuplicates += records.length - 1;

      const keep = selectRecordToKeep(records);
      const remove = records.filter((r) => String(r._id) !== String(keep._id));
      deleteIds.push(...remove.map((r) => r._id));

      console.log(`\nDuplicate group pidx=${pidx}`);
      console.log(`  Keep:   ${keep._id} | status=${keep.paymentStatus} | createdAt=${new Date(keep.createdAt).toISOString()}`);
      for (const rec of remove) {
        console.log(`  Remove: ${rec._id} | status=${rec.paymentStatus} | createdAt=${new Date(rec.createdAt).toISOString()}`);
      }
    }

    if (duplicateGroups === 0) {
      console.log('No duplicates found by pidx.');
      await mongoose.connection.close();
      return;
    }

    console.log('\nSummary');
    console.log(`  Duplicate groups: ${duplicateGroups}`);
    console.log(`  Duplicate rows:   ${totalDuplicates}`);
    console.log(`  Mode:             ${shouldApply ? 'APPLY (deleting)' : 'DRY-RUN (no deletion)'}`);

    if (shouldApply) {
      const result = await SubscriptionPayment.deleteMany({ _id: { $in: deleteIds } });
      console.log(`Deleted rows: ${result.deletedCount}`);
    } else {
      console.log('No records were deleted. Re-run with --apply to execute deletion.');
    }

    await mongoose.connection.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Cleanup failed:', error);
    try {
      await mongoose.connection.close();
    } catch {
      // Ignore secondary close errors.
    }
    process.exit(1);
  }
}

removeDuplicates();
