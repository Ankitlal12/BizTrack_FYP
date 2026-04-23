const cron = require("node-cron");
const User = require("../models/User");
const AdminContactMessage = require("../models/AdminContactMessage");
const { createNotification } = require("../utils/notificationHelper");

// Check subscriptions every hour
const checkSubscriptions = async () => {
  try {
    console.log("🔍 Checking subscription statuses...");
    
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Find all SaaS customers
    const owners = await User.find({ 
      role: "owner", 
      isSaasCustomer: true,
      accountStatus: { $ne: "deleted" }
    });

    for (const owner of owners) {
      if (!owner.subscriptionExpiresAt) continue;

      const expiryDate = new Date(owner.subscriptionExpiresAt);
      const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      // Auto-freeze expired accounts
      if (expiryDate < now && owner.accountStatus !== "frozen") {
        console.log(`❄️ Freezing expired account: ${owner.email}`);
        
        owner.accountStatus = "frozen";
        owner.active = false;
        await owner.save();

        // Freeze all team members
        await User.updateMany(
          { tenantKey: owner.tenantKey, _id: { $ne: owner._id } },
          { $set: { active: false } }
        );

        // Create admin notification
        await AdminContactMessage.create({
          type: "subscription_expired",
          clientId: owner._id,
          clientEmail: owner.email,
          clientName: owner.name,
          title: `Subscription Expired - ${owner.email}`,
          message: `Account automatically frozen due to subscription expiry (10-day period). Last payment: ${owner.subscriptionLastPaidAt?.toLocaleDateString() || 'N/A'}. Days expired: ${Math.abs(daysLeft)}`,
          actionUrl: `/admin/users`,
          metadata: {
            expiryDate: expiryDate,
            daysExpired: Math.abs(daysLeft),
            subscriptionPeriod: "10 days",
          },
        });

        // Notify owner (in-app)
        try {
          await createNotification({
            tenantKey: owner.tenantKey,
            type: "subscription_expired",
            title: "Subscription Expired",
            message: "Your 10-day subscription has expired. Please renew to continue using the service.",
            metadata: {
              expiryDate: expiryDate,
              daysExpired: Math.abs(daysLeft),
            },
          });
        } catch (err) {
          console.error("Failed to create owner notification:", err);
        }

        // Send email notification to owner about expiry
        try {
          const { sendAccountStatusEmail } = require("../utils/otpService");
          await sendAccountStatusEmail(
            owner.email,
            owner.name,
            "frozen",
            `Your subscription expired on ${expiryDate.toLocaleDateString()}. Your account has been frozen and you can no longer access the system. Please renew your subscription to regain access.`
          );
          console.log(`✅ Subscription expired email sent to ${owner.email}`);
        } catch (emailError) {
          console.error("Failed to send subscription expired email:", emailError);
        }
      }

      // Send warning notifications when less than 2 days left
      if (daysLeft > 0 && daysLeft < 2 && owner.accountStatus === "active") {
        console.log(`⚠️ Sending expiry warning to: ${owner.email} (${daysLeft} days left)`);

        // Create admin notification
        await AdminContactMessage.create({
          type: "subscription_expiring_soon",
          clientId: owner._id,
          clientEmail: owner.email,
          clientName: owner.name,
          title: `Subscription Expiring Soon - ${owner.email}`,
          message: `Only ${daysLeft} day(s) remaining in 10-day subscription. Expires on ${expiryDate.toLocaleDateString()}`,
          actionUrl: `/admin/users`,
          metadata: {
            expiryDate: expiryDate,
            daysLeft: daysLeft,
            subscriptionPeriod: "10 days",
          },
        });

        // Notify owner (in-app)
        try {
          await createNotification({
            tenantKey: owner.tenantKey,
            type: "subscription_expiring_soon",
            title: "Subscription Expiring Soon",
            message: `Your 10-day subscription expires in ${daysLeft} day(s). Please renew to avoid service interruption.`,
            metadata: {
              expiryDate: expiryDate,
              daysLeft: daysLeft,
            },
          });
        } catch (err) {
          console.error("Failed to create owner notification:", err);
        }

        // Send email notification to owner
        try {
          const { sendSubscriptionExpiryWarningEmail } = require("../utils/otpService");
          await sendSubscriptionExpiryWarningEmail(
            owner.email,
            owner.name,
            daysLeft,
            expiryDate
          );
          console.log(`✅ Expiry warning email sent to ${owner.email}`);
        } catch (emailError) {
          console.error("Failed to send expiry warning email:", emailError);
        }
      }
    }

    console.log("✅ Subscription check completed");
  } catch (error) {
    console.error("❌ Error checking subscriptions:", error);
  }
};

// Run every hour
const startSubscriptionScheduler = () => {
  console.log("🚀 Starting subscription scheduler (runs every hour)");
  
  // Run immediately on startup
  checkSubscriptions();
  
  // Then run every hour
  cron.schedule("0 * * * *", checkSubscriptions);
};

module.exports = { startSubscriptionScheduler, checkSubscriptions };
