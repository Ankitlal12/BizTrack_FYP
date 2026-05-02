const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const SaasSignup = require("../models/SaasSignup");
const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");
const AdminAuditLog = require("../models/AdminAuditLog");
const AdminContactMessage = require("../models/AdminContactMessage");
const SubscriptionPayment = require("../models/SubscriptionPayment");
const { initiateKhaltiPayment, verifyKhaltiPayment } = require("../utils/khaltiService");
const { generateToken } = require("../utils/jwt");
const { verifyToken, extractTokenFromHeader } = require("../utils/jwt");
const { sendSignupConfirmationEmail } = require("../utils/otpService");

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "905396434192-03aqn8vkab2knh33brep80bfvmh3ojik.apps.googleusercontent.com";

const SAAS_SIGNUP_AMOUNT = Number(process.env.SAAS_SIGNUP_AMOUNT || 999);
const SAAS_SUBSCRIPTION_DAYS = Number(process.env.SAAS_SUBSCRIPTION_DAYS || 30);

// CRITICAL: Validate configuration
if (SAAS_SUBSCRIPTION_DAYS < 1) {
  console.warn('⚠️  WARNING: SAAS_SUBSCRIPTION_DAYS is', SAAS_SUBSCRIPTION_DAYS, '- defaulting to 30 days');
}

if (process.env.SAAS_SUBSCRIPTION_DAYS) {
  console.log('✅ SAAS_SUBSCRIPTION_DAYS configured:', SAAS_SUBSCRIPTION_DAYS, 'days');
} else {
  console.log('⚠️  SAAS_SUBSCRIPTION_DAYS using default:', SAAS_SUBSCRIPTION_DAYS, 'days');
}

const getSubscriptionExpiry = () => {
  const expires = new Date();
  expires.setDate(expires.getDate() + SAAS_SUBSCRIPTION_DAYS);
  return expires;
};

const recordSaasFlowLoginHistory = async (user, req) => {
  try {
    if (!user?._id || !user?.tenantKey) return;

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentLogin = await LoginHistory.findOne({
      userId: user._id,
      loginMethod: "google",
      success: true,
      loginTime: { $gte: oneMinuteAgo },
    });

    if (recentLogin) return;

    await LoginHistory.create({
      tenantKey: user.tenantKey,
      userId: user._id,
      userName: user.name || user.email,
      userRole: user.role || "owner",
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("User-Agent"),
      loginMethod: "google",
      success: true,
      loginTime: new Date(),
    });
  } catch (error) {
    console.error("Failed to record SaaS flow login history:", error);
  }
};

// Admin session times removed - no longer tracking in audit logs

const verifyGoogleToken = async (credential) => {
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};

const generateUniqueUsername = async (email) => {
  const base = String(email || "owner")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") || "owner";

  let username = `${base}owner`;
  let counter = 1;

  while (await User.findOne({ username })) {
    username = `${base}owner${counter++}`;
    if (counter > 1000) {
      username = `owner${Date.now()}`;
      break;
    }
  }

  return username;
};

const findExistingSignup = async ({ email, googleId }) => {
  const queries = [];
  if (email) queries.push({ email: String(email).toLowerCase() });
  if (googleId) queries.push({ googleId });

  if (queries.length === 0) return null;

  return SaasSignup.findOne({ $or: queries });
};

const findExistingOwnerAccount = async ({ email, googleId }) => {
  const queries = [];
  if (email) queries.push({ email: String(email).toLowerCase() });
  if (googleId) queries.push({ googleId });

  if (queries.length === 0) return null;

  return User.findOne({ $or: queries });
};

exports.initiateGoogleSignup = async (req, res) => {
  try {
    const { credential, businessName, phone, password, confirmPassword } = req.body;

    const authToken = extractTokenFromHeader(req.headers.authorization);
    if (authToken) {
      try {
        const decoded = verifyToken(authToken);
        if (decoded?.id) {
          return res.status(409).json({
            error: "You are already logged in. Please log out before creating a new workspace.",
          });
        }
      } catch {
        // Ignore invalid/expired token and continue signup as guest.
      }
    }

    if (!credential) {
      return res.status(400).json({ error: "Google credential is required." });
    }

    if (!businessName || !businessName.trim()) {
      return res.status(400).json({ error: "Business name is required." });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Password and confirm password do not match." });
    }

    const payload = await verifyGoogleToken(credential);
    const { sub: googleId, email, name } = payload;

    if (!email) {
      return res.status(400).json({ error: "Google account email is required." });
    }

    const normalizedEmail = String(email).toLowerCase();
    const existingUser = await findExistingOwnerAccount({ email: normalizedEmail, googleId });
    
    // If user exists, don't allow signup
    if (existingUser) {
      return res.status(409).json({
        error: "This email is already registered. Please log in instead of signing up.",
      });
    }

    // Check for existing signup, but only block if user still exists
    const existingSignup = await findExistingSignup({ email: normalizedEmail, googleId });
    if (existingSignup && existingSignup.paymentStatus !== "failed") {
      // If signup exists but user was deleted, allow re-signup
      if (existingSignup.ownerUserId) {
        const signupUser = await User.findById(existingSignup.ownerUserId);
        if (!signupUser) {
          console.log(`ℹ️ Previous signup found but user deleted, allowing re-signup for ${normalizedEmail}`);
          // User was deleted, allow re-signup by not blocking
        } else {
          // User still exists, block signup
          return res.status(409).json({
            error: "This Google account already has a pending or completed workspace signup. Please log in instead.",
          });
        }
      } else {
        // Signup exists but no user created yet (payment pending/failed)
        return res.status(409).json({
          error: "This Google account already has a pending or completed workspace signup. Please log in instead.",
        });
      }
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const signup = await SaasSignup.create({
      businessName: businessName.trim(),
      email: normalizedEmail,
      googleId,
      ownerName: name || businessName.trim(),
      passwordHash,
      phone: phone ? String(phone).trim() : "",
      amount: SAAS_SIGNUP_AMOUNT,
      currency: "NPR",
    });

    const paymentInit = await initiateKhaltiPayment({
      amount: SAAS_SIGNUP_AMOUNT,
      purchaseOrderId: `SAAS-${signup._id}`,
      purchaseOrderName: `BizTrack SaaS Onboarding - ${businessName.trim()}`,
      customerInfo: {
        name: name || businessName.trim(),
        email,
        phone: phone || "9800000000",
      },
      productDetails: [
        {
          id: "biztrack-saas-plan",
          name: "BizTrack SaaS 10-Day Subscription",
          quantity: 1,
          unit_price: SAAS_SIGNUP_AMOUNT,
          total_price: SAAS_SIGNUP_AMOUNT,
        },
      ],
      paymentType: 'admin',
      returnUrl: process.env.SAAS_RETURN_URL || "http://localhost:5173/signup/payment-success",
    });

    signup.pidx = paymentInit.pidx;
    signup.paymentStatus = "initiated";
    await signup.save();

    return res.json({
      signupId: signup._id,
      amount: SAAS_SIGNUP_AMOUNT,
      paymentUrl: paymentInit.payment_url,
      pidx: paymentInit.pidx,
    });
  } catch (error) {
    console.error("Failed to initiate SaaS signup:", error);
    return res.status(500).json({ error: error.message || "Failed to start signup." });
  }
};

exports.verifyGoogleSignupPayment = async (req, res) => {
  try {
    const { pidx } = req.body;

    if (!pidx) {
      return res.status(400).json({ error: "Payment identifier is required." });
    }

    const signup = await SaasSignup.findOne({ pidx });
    if (!signup) {
      return res.status(404).json({ error: "Signup record not found for this payment." });
    }

    let owner = await User.findOne({
      $or: [{ email: signup.email }, { googleId: signup.googleId }],
    });

    // Idempotency: if this signup payment was already completed, do not process it again.
    if (signup.paymentStatus === "completed") {
      if (!owner && signup.ownerUserId) {
        owner = await User.findById(signup.ownerUserId);
      }
      if (!owner) {
        return res.status(409).json({ error: "Signup already processed but owner account was not found." });
      }

      await recordSaasFlowLoginHistory(owner, req);

      const token = generateToken(owner);
      const ownerResponse = owner.toObject();
      delete ownerResponse.password;

      return res.json({
        message: "Signup payment already processed.",
        user: ownerResponse,
        token,
        workspace: {
          businessName: signup.businessName,
          ownerEmail: signup.email,
        },
        alreadyProcessed: true,
      });
    }

    // Secondary idempotency guard for duplicate callbacks on the same pidx.
    const existingPayment = await SubscriptionPayment.findOne({ pidx });
    if (existingPayment) {
      signup.paymentStatus = "completed";
      signup.status = "completed";
      if (!signup.ownerUserId && owner?._id) {
        signup.ownerUserId = owner._id;
      }
      await signup.save();

      if (!owner && existingPayment.ownerId) {
        owner = await User.findById(existingPayment.ownerId);
      }
      if (!owner) {
        return res.status(409).json({ error: "Signup already processed but owner account was not found." });
      }

      await recordSaasFlowLoginHistory(owner, req);

      const token = generateToken(owner);
      const ownerResponse = owner.toObject();
      delete ownerResponse.password;

      return res.json({
        message: "Signup payment already processed.",
        user: ownerResponse,
        token,
        workspace: {
          businessName: signup.businessName,
          ownerEmail: signup.email,
        },
        alreadyProcessed: true,
      });
    }

    const verification = await verifyKhaltiPayment(pidx, 'admin');

    if (!verification.isCompleted) {
      signup.paymentStatus = "failed";
      signup.status = "failed";
      await signup.save();
      return res.status(400).json({ error: verification.message || "Payment not completed." });
    }

    if (!owner) {
      const username = await generateUniqueUsername(signup.email);
      const securePassword = signup.passwordHash || await bcrypt.hash(`${signup.googleId}-${Date.now()}`, 10);

      try {
        const expiryDate = getSubscriptionExpiry();
        owner = await User.create({
          name: signup.ownerName,
          email: signup.email,
          username,
          password: securePassword,
          googleId: signup.googleId,
          role: "owner",
          tenantKey: `tenant_${signup._id}`,
          isSaasCustomer: true,
          accountStatus: "active",
          subscriptionPlan: "monthly",
          subscriptionLastPaidAt: new Date(),
          subscriptionExpiresAt: expiryDate,
          active: true,
          dateAdded: new Date(),
        });
        console.log(`✅ New owner created with subscription expiring: ${expiryDate.toISOString()}`);
      } catch (createError) {
        if (createError?.code === 11000) {
          owner = await User.findOne({
            $or: [{ email: signup.email }, { googleId: signup.googleId }],
          });
          if (!owner) {
            throw createError;
          }
        } else {
          throw createError;
        }
      }
    } else {
      let changed = false;
      if (owner.role !== "owner") {
        owner.role = "owner";
        changed = true;
      }
      if (!owner.active) {
        owner.active = true;
        changed = true;
      }
      if (!owner.googleId && signup.googleId) {
        owner.googleId = signup.googleId;
        changed = true;
      }
      if (!owner.tenantKey) {
        owner.tenantKey = `tenant_${signup._id}`;
        changed = true;
      }
      owner.isSaasCustomer = true;
      owner.accountStatus = "active";
      owner.subscriptionPlan = "monthly";
      owner.subscriptionLastPaidAt = new Date();
      
      // CRITICAL: Ensure subscriptionExpiresAt is properly set
      const expiryDate = getSubscriptionExpiry();
      owner.subscriptionExpiresAt = expiryDate;
      changed = true;
      
      if (changed) {
        await owner.save();
        console.log(`✅ Existing owner updated with subscription expiring: ${expiryDate.toISOString()}`);
      }
    }

    if (owner.passwordHash) {
      owner.password = owner.passwordHash;
    }

    signup.paymentStatus = "completed";
    signup.status = "completed";
    signup.ownerUserId = owner._id;
    await signup.save();

    // Record payment history (check for duplicates first)
    try {
      const existingPayment = await SubscriptionPayment.findOne({ pidx: pidx });
      
      if (existingPayment) {
        console.log(`ℹ️ Payment already recorded for pidx: ${pidx}, skipping duplicate`);
      } else {
        const newPayment = await SubscriptionPayment.create({
          ownerId: owner._id,
          ownerEmail: owner.email,
          ownerName: owner.name,
          businessName: signup.businessName,
          amount: SAAS_SIGNUP_AMOUNT,
          currency: "NPR",
          paymentMethod: "khalti",
          pidx: pidx,
          paymentStatus: "completed",
          paymentType: "initial",
          subscriptionStartDate: owner.subscriptionLastPaidAt,
          subscriptionEndDate: owner.subscriptionExpiresAt,
          daysGranted: SAAS_SUBSCRIPTION_DAYS,
          metadata: {
            signupId: signup._id,
            verificationData: verification,
          },
        });
        console.log(`✅ Payment history recorded for initial signup: ${newPayment._id}`);
      }
    } catch (paymentError) {
      if (paymentError.code === 11000) {
        console.log(`ℹ️ Duplicate key error for pidx: ${pidx}, payment already exists`);
      } else {
        console.error("Failed to record payment history:", paymentError);
      }
    }

    // Send email notification
    try {
      const { sendPaymentConfirmationEmail } = require("../utils/otpService");
      await sendPaymentConfirmationEmail(
        owner.email,
        owner.name,
        SAAS_SIGNUP_AMOUNT,
        "initial",
        owner.subscriptionExpiresAt,
        SAAS_SUBSCRIPTION_DAYS
      );
      console.log("✅ Payment confirmation email sent");
    } catch (emailError) {
      console.error("Failed to send payment confirmation email:", emailError);
    }

    // Create in-app notification for user on successful first payment
    try {
      if (!owner.tenantKey) {
        owner.tenantKey = `tenant_${owner._id}`;
        await owner.save();
      }

      const { createNotification } = require("../utils/notificationHelper");
      await createNotification({
        tenantKey: owner.tenantKey,
        type: "subscription_renewed",
        title: "Subscription Payment Successful",
        message: `Your payment of NPR ${SAAS_SIGNUP_AMOUNT} was successful. Your subscription is now active until ${new Date(owner.subscriptionExpiresAt).toLocaleDateString()}.`,
        metadata: {
          amount: SAAS_SIGNUP_AMOUNT,
          paymentType: "initial",
          expiresAt: owner.subscriptionExpiresAt,
          daysGranted: SAAS_SUBSCRIPTION_DAYS,
        },
      });
      console.log("✅ In-app notification created for initial payment");
    } catch (notifError) {
      console.error("Failed to create initial payment notification:", notifError);
    }

    // Create admin contact message (with deduplication)
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentMessage = await AdminContactMessage.findOne({
        type: "payment_received",
        clientId: owner._id,
        createdAt: { $gte: oneMinuteAgo },
      });

      if (recentMessage) {
        console.log(`⏭️ Skipping duplicate admin message: payment_received for ${owner.email} (recent one exists)`);
      } else {
        await AdminContactMessage.create({
          type: "payment_received",
          clientId: owner._id,
          clientEmail: owner.email,
          clientName: owner.name,
          title: `New Payment Received - ${owner.email}`,
          message: `Initial subscription payment of NPR ${SAAS_SIGNUP_AMOUNT} received. 10-day subscription activated until ${owner.subscriptionExpiresAt.toLocaleDateString()}.`,
          actionUrl: `/admin/payment-history`,
          metadata: {
            amount: SAAS_SIGNUP_AMOUNT,
            paymentType: "initial",
            subscriptionDays: SAAS_SUBSCRIPTION_DAYS,
            expiryDate: owner.subscriptionExpiresAt,
          },
        });
        console.log("✅ Admin contact message created");
      }
    } catch (contactError) {
      console.error("Failed to create admin contact message:", contactError);
    }

    try {
      await sendSignupConfirmationEmail(owner.email, owner.name || signup.ownerName, signup.businessName);
    } catch (emailError) {
      console.error("Failed to send signup confirmation email:", emailError);
    }

    await recordSaasFlowLoginHistory(owner, req);

    // Fetch fresh owner data to ensure consistency
    const freshOwnerData = await User.findById(owner._id);
    if (!freshOwnerData) {
      console.error('⚠️  Warning: Owner not found after initial signup!');
      const token = generateToken(owner);
      const ownerResponse = owner.toObject();
      delete ownerResponse.password;
      return res.json({
        message: "Signup completed successfully.",
        user: ownerResponse,
        token,
        workspace: {
          businessName: signup.businessName,
          ownerEmail: signup.email,
        },
      });
    }

    const token = generateToken(freshOwnerData);
    const ownerResponse = freshOwnerData.toObject();
    delete ownerResponse.password;

    return res.json({
      message: "Signup completed successfully.",
      user: ownerResponse,
      token,
      workspace: {
        businessName: signup.businessName,
        ownerEmail: signup.email,
      },
    });
  } catch (error) {
    console.error("Failed to verify SaaS signup payment:", error);
    return res.status(500).json({ error: error.message || "Failed to verify payment." });
  }
};

exports.initiateRenewalGoogle = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Google credential is required." });
    }

    const payload = await verifyGoogleToken(credential);
    const { sub: googleId, email, name } = payload;
    const normalizedEmail = String(email || "").toLowerCase();

    const owner = await User.findOne({ email: normalizedEmail, role: "owner" });
    if (!owner) {
      return res.status(404).json({ error: "Owner account not found for this Google email." });
    }

    // Prevent accidental duplicate renewal attempts in a short period.
    const recentInitiatedRenewal = await SaasSignup.findOne({
      email: normalizedEmail,
      paymentStatus: "initiated",
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    }).sort({ createdAt: -1 });

    if (recentInitiatedRenewal) {
      return res.status(409).json({
        error: "A renewal payment is already in progress. Please complete that payment first.",
      });
    }

    if (owner.accountStatus === "deleted") {
      return res.status(403).json({ error: "This owner account is no longer available for renewal." });
    }

    const signup = await SaasSignup.create({
      businessName: owner.name || "BizTrack Workspace",
      email: normalizedEmail,
      googleId,
      ownerName: name || owner.name,
      phone: "",
      amount: SAAS_SIGNUP_AMOUNT,
      currency: "NPR",
    });

    const paymentInit = await initiateKhaltiPayment({
      amount: SAAS_SIGNUP_AMOUNT,
      purchaseOrderId: `RENEW-${signup._id}`,
      purchaseOrderName: `BizTrack 10-Day Renewal - ${owner.name}`,
      customerInfo: {
        name: name || owner.name,
        email: normalizedEmail,
        phone: "9800000000",
      },
      productDetails: [
        {
          id: "biztrack-10day-renewal",
          name: "BizTrack 10-Day Subscription Renewal",
          quantity: 1,
          unit_price: SAAS_SIGNUP_AMOUNT,
          total_price: SAAS_SIGNUP_AMOUNT,
        },
      ],
      paymentType: 'admin',
      returnUrl: process.env.SAAS_RENEW_RETURN_URL || "http://localhost:5173/renew/payment-success",
    });

    signup.pidx = paymentInit.pidx;
    signup.paymentStatus = "initiated";
    await signup.save();

    return res.json({
      paymentUrl: paymentInit.payment_url,
      pidx: paymentInit.pidx,
      amount: SAAS_SIGNUP_AMOUNT,
      signupId: signup._id,
    });
  } catch (error) {
    console.error("Failed to initiate renewal:", error);
    return res.status(500).json({ error: error.message || "Failed to start renewal." });
  }
};

exports.verifyRenewalPayment = async (req, res) => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔄 RENEWAL PAYMENT VERIFICATION STARTED - NEW CODE VERSION 2.0');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    const { pidx } = req.body;

    if (!pidx) {
      return res.status(400).json({ error: "Payment identifier is required." });
    }

    // CRITICAL FIX: Handle both initial signups (SaasSignup) and renewals (SubscriptionPayment)
    // For initial signups: pidx is in SaasSignup
    // For renewals: pidx is in SubscriptionPayment
    
    let signup = await SaasSignup.findOne({ pidx });
    let owner = null;
    let isRenewal = false;

    if (signup) {
      // Initial signup flow
      owner = await User.findOne({ email: signup.email, role: "owner" });
      if (!owner) {
        return res.status(404).json({ error: "Owner account not found." });
      }

      // Idempotency: if this signup was already processed, don't apply extension again.
      if (signup.paymentStatus === "completed") {
        await recordSaasFlowLoginHistory(owner, req);

        const token = generateToken(owner);
        const ownerResponse = owner.toObject();
        delete ownerResponse.password;

        return res.json({
          message: "Subscription payment already processed.",
          user: ownerResponse,
          token,
          subscriptionExpiresAt: owner.subscriptionExpiresAt,
          daysGranted: SAAS_SUBSCRIPTION_DAYS,
          alreadyProcessed: true,
        });
      }
    } else {
      // Renewal flow: look for existing payment by pidx
      const existingPayment = await SubscriptionPayment.findOne({ pidx });
      if (existingPayment) {
        // Already processed renewal
        owner = await User.findById(existingPayment.ownerId);
        if (!owner) {
          return res.status(404).json({ error: "Owner account not found." });
        }

        await recordSaasFlowLoginHistory(owner, req);

        const token = generateToken(owner);
        const ownerResponse = owner.toObject();
        delete ownerResponse.password;

        return res.json({
          message: "Subscription renewal already processed.",
          user: ownerResponse,
          token,
          subscriptionExpiresAt: owner.subscriptionExpiresAt,
          daysGranted: existingPayment.daysGranted || SAAS_SUBSCRIPTION_DAYS,
          alreadyProcessed: true,
        });
      } else {
        // New renewal: pidx doesn't exist yet, so we need to check with Khalti first
        // Then create SubscriptionPayment for this renewal
        isRenewal = true;
        
        // For renewals, we need to verify the payment first, then look up owner
        // We'll verify it and then try to match it to an existing owner
        console.log('🔄 Renewal payment detected (pidx not in DB yet)');
      }
    }

    // If still no owner for renewal, continue - will get it after Khalti verification
    if (!owner && !isRenewal) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    const verification = await verifyKhaltiPayment(pidx, 'admin');

    if (!verification.isCompleted) {
      signup.paymentStatus = "failed";
      signup.status = "failed";
      await signup.save();
      return res.status(400).json({ error: verification.message || "Payment not completed." });
    }

    // Update subscription dates
    const now = new Date();
    
    console.log('🔍 Renewal Debug Info:');
    console.log('   Owner email:', owner.email);
    console.log('   Owner subscriptionExpiresAt (raw from DB):', owner.subscriptionExpiresAt);
    console.log('   Current time:', now.toISOString());
    
    // CRITICAL FIX FOR RENEWALS: Check payment history FIRST to get accurate previous subscription end
    // This ensures we add 10 days to the RIGHT base, not lose days in the process
    console.log('   🔎 Checking payment history for accurate subscription end date...');
    let currentExpiry = null;
    
    // IMPORTANT: Skip payments created today or with today's end date (these are likely broken)
    // and find the most recent VALID payment from yesterday or earlier
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const validPayments = await SubscriptionPayment.find({ 
      ownerId: owner._id,
      createdAt: { $lt: todayStart } // Only payments from before today
    })
      .sort({ createdAt: -1 })
      .select('subscriptionEndDate paymentType createdAt')
      .limit(5);
    
    let latestValidPayment = null;
    if (validPayments.length > 0) {
      // Use the most recent valid payment
      latestValidPayment = validPayments[0];
      console.log('   ✅ Found valid payment from before today');
    } else {
      // If no payments from before today, don't look at today's payments
      // Instead, we'll rely on owner.subscriptionExpiresAt
      console.log(`   ⚠️  No valid payments from before today`);
    }
    
    // CRITICAL VALIDATION: Even if payment found, verify it has a valid future end date
    let paymentEndDate = null;
    if (latestValidPayment && latestValidPayment.subscriptionEndDate) {
      paymentEndDate = new Date(latestValidPayment.subscriptionEndDate);
      console.log(`   Payment end date: ${paymentEndDate.toISOString()}`);
      
      // If payment end date is today or in past, it's invalid
      if (paymentEndDate <= now) {
        console.log(`   ⚠️  Payment end date is TODAY/PAST (invalid), ignoring this payment`);
        paymentEndDate = null;
      }
    }
    
    if (paymentEndDate) {
      currentExpiry = paymentEndDate;
      console.log(`   ✅ Using payment end date as base`);
    } else if (owner.subscriptionExpiresAt) {
      // Use owner's subscription end date (works for both future and today/past dates)
      currentExpiry = new Date(owner.subscriptionExpiresAt);
      console.log('   ✅ Using owner.subscriptionExpiresAt as base');
    } else {
      currentExpiry = now;
      console.log('   ⚠️  No valid data, using current time as base');
    }
    
    console.log('   Current expiry (will be used as base):', currentExpiry.toISOString());
    console.log('   Current expiry timestamp:', currentExpiry.getTime());
    console.log('   Now timestamp:', now.getTime());
    const daysUntilExpiry = Math.ceil((currentExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    console.log('   Days remaining before renewal:', daysUntilExpiry);
    console.log('   Is expired? (currentExpiry <= now):', currentExpiry <= now);
    
    // ALWAYS extend from current expiry date, regardless of whether it's expired
    // This ensures users get the full benefit of renewing early or get a fresh subscription if expired
    const startDate = new Date(currentExpiry);
    const newExpiry = new Date(startDate);
    newExpiry.setDate(newExpiry.getDate() + SAAS_SUBSCRIPTION_DAYS);
    
    console.log('   ---');
    console.log('   Start date for calculation:', startDate.toISOString());
    console.log('   Days to add (SAAS_SUBSCRIPTION_DAYS):', SAAS_SUBSCRIPTION_DAYS);
    console.log('   New expiry:', newExpiry.toISOString());
    console.log('   New expiry (local):', newExpiry.toString());
    console.log('   Days from now to new expiry:', Math.ceil((newExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    console.log('   ---');

    owner.subscriptionLastPaidAt = now;
    owner.subscriptionExpiresAt = newExpiry;
    owner.accountStatus = "active";
    owner.active = true;
    
    console.log('   Saving to database...');
    console.log('   New subscriptionExpiresAt being saved:', owner.subscriptionExpiresAt);
    
    await owner.save();
    
    console.log('   ✅ Saved successfully!');
    console.log('═══════════════════════════════════════════════════════');

    // Reactivate all team members
    if (owner.tenantKey) {
      await User.updateMany(
        { tenantKey: owner.tenantKey, _id: { $ne: owner._id } },
        { $set: { active: true } }
      );
    }

    // Update signup record if it exists
    if (signup) {
      signup.paymentStatus = "completed";
      signup.status = "completed";
      signup.ownerUserId = owner._id;
      await signup.save();
    }

    // Record payment history (check for duplicates first)
    try {
      const existingPayment = await SubscriptionPayment.findOne({ pidx: pidx });
      
      if (existingPayment) {
        console.log(`ℹ️ Payment already recorded for pidx: ${pidx}, skipping duplicate`);
      } else {
        const newPayment = await SubscriptionPayment.create({
          ownerId: owner._id,
          ownerEmail: owner.email,
          ownerName: owner.name,
          businessName: signup.businessName,
          amount: SAAS_SIGNUP_AMOUNT,
          currency: "NPR",
          paymentMethod: "khalti",
          pidx: pidx,
          paymentStatus: "completed",
          paymentType: "renewal",
          subscriptionStartDate: startDate,
          subscriptionEndDate: newExpiry,
          daysGranted: SAAS_SUBSCRIPTION_DAYS,
          metadata: {
            signupId: signup._id,
            verificationData: verification,
            previousExpiry: currentExpiry,
          },
        });
        console.log(`✅ Payment history recorded for renewal: ${newPayment._id}`);
      }
    } catch (paymentError) {
      if (paymentError.code === 11000) {
        console.log(`ℹ️ Duplicate key error for pidx: ${pidx}, payment already exists`);
      } else {
        console.error("Failed to record payment history:", paymentError);
      }
    }

    // Send email notification to user
    try {
      const { sendPaymentConfirmationEmail } = require("../utils/otpService");
      await sendPaymentConfirmationEmail(
        owner.email,
        owner.name,
        SAAS_SIGNUP_AMOUNT,
        "renewal",
        newExpiry,
        SAAS_SUBSCRIPTION_DAYS
      );
      console.log("✅ Renewal confirmation email sent to user");
    } catch (emailError) {
      console.error("Failed to send renewal confirmation email:", emailError);
    }

    // Create in-app notification for user
    try {
      const { createNotification } = require("../utils/notificationHelper");
      await createNotification({
        tenantKey: owner.tenantKey,
        type: "subscription_renewed",
        title: "Subscription Renewed Successfully",
        message: `Your subscription has been renewed for ${SAAS_SUBSCRIPTION_DAYS} more days. New expiry date: ${newExpiry.toLocaleDateString()}. Thank you for continuing with BizTrack!`,
        metadata: {
          amount: SAAS_SIGNUP_AMOUNT,
          newExpiryDate: newExpiry,
          daysGranted: SAAS_SUBSCRIPTION_DAYS,
          previousExpiry: currentExpiry,
        },
      });
      console.log("✅ In-app notification created for user");
    } catch (notifError) {
      console.error("Failed to create user notification:", notifError);
    }

    // Create admin contact message (with deduplication)
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentMessage = await AdminContactMessage.findOne({
        type: "subscription_renewed",
        clientId: owner._id,
        createdAt: { $gte: oneMinuteAgo },
      });

      if (recentMessage) {
        console.log(`⏭️ Skipping duplicate admin message: subscription_renewed for ${owner.email} (recent one exists)`);
      } else {
        const daysRemaining = Math.ceil((newExpiry - now) / (1000 * 60 * 60 * 24));
        const wasExpired = currentExpiry < now;
        
        await AdminContactMessage.create({
          type: "subscription_renewed",
          clientId: owner._id,
          clientEmail: owner.email,
          clientName: owner.name,
          title: `User Renewed Subscription - ${owner.email}`,
          message: wasExpired 
            ? `User ${owner.name} (${owner.email}) renewed their expired subscription. Payment: NPR ${SAAS_SIGNUP_AMOUNT}. New expiry: ${newExpiry.toLocaleDateString()} (${daysRemaining} days from now).`
            : `User ${owner.name} (${owner.email}) renewed their subscription early. Payment: NPR ${SAAS_SIGNUP_AMOUNT}. Extended from ${currentExpiry.toLocaleDateString()} to ${newExpiry.toLocaleDateString()} (${daysRemaining} total days remaining).`,
          actionUrl: `/admin/payment-history`,
          metadata: {
            amount: SAAS_SIGNUP_AMOUNT,
            paymentType: "renewal",
            subscriptionDays: SAAS_SUBSCRIPTION_DAYS,
            newExpiryDate: newExpiry,
            previousExpiry: currentExpiry,
            wasExpired: wasExpired,
            totalDaysRemaining: daysRemaining,
          },
        });
        console.log("✅ Admin contact message created for renewal");
      }
    } catch (contactError) {
      console.error("Failed to create admin contact message:", contactError);
    }

    await recordSaasFlowLoginHistory(owner, req);

    // Fetch fresh owner data from database to ensure we have the latest
    const freshOwner = await User.findById(owner._id);
    if (!freshOwner) {
      console.error('⚠️  Critical: Owner not found after save!');
      return res.status(500).json({ error: 'Failed to verify renewal - owner data corrupted' });
    }

    console.log('✅ RENEWAL VERIFICATION COMPLETE');
    console.log('   Fresh owner subscriptionExpiresAt from DB:', freshOwner.subscriptionExpiresAt);
    console.log('   Expected new expiry:', newExpiry.toISOString());
    console.log('   Match:', freshOwner.subscriptionExpiresAt?.getTime() === newExpiry.getTime());

    const token = generateToken(freshOwner);
    const ownerResponse = freshOwner.toObject();
    delete ownerResponse.password;

    return res.json({
      message: "Subscription renewed successfully.",
      user: ownerResponse,
      token,
      subscriptionExpiresAt: freshOwner.subscriptionExpiresAt,
      subscriptionLastPaidAt: freshOwner.subscriptionLastPaidAt,
      daysGranted: SAAS_SUBSCRIPTION_DAYS,
    });
  } catch (error) {
    console.error("Failed to verify renewal payment:", error);
    return res.status(500).json({ error: error.message || "Failed to verify payment." });
  }
};

exports.getSaasClients = async (req, res) => {
  try {
    // No need to filter deleted users - they're permanently removed from database
    const owners = await User.find({ 
      role: "owner"
    }).select("name email active tenantKey subscriptionExpiresAt accountStatus subscriptionLastPaidAt createdAt");

    const now = new Date();
    const result = await Promise.all(
      owners.map(async (owner) => {
        const staffCount = await User.countDocuments({ tenantKey: owner.tenantKey, role: { $in: ["manager", "staff"] } });
        const lastLoginRecord = await LoginHistory.findOne({ userId: owner._id, success: true })
          .sort({ loginTime: -1 })
          .select("loginTime");
        
        let daysRemaining = null;
        let subscriptionExpired = false;
        
        if (owner.subscriptionExpiresAt) {
          const expiryDate = new Date(owner.subscriptionExpiresAt);
          const diffTime = expiryDate - now;
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          subscriptionExpired = expiryDate < now;
        }

        return {
          ...owner.toObject(),
          staffCount,
          subscriptionExpired,
          daysRemaining,
          lastLoginAt: lastLoginRecord?.loginTime || owner.subscriptionLastPaidAt || owner.createdAt || null,
        };
      })
    );

    return res.json(result);
  } catch (error) {
    console.error("Failed to get SaaS clients:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch clients." });
  }
};

exports.freezeSaasClient = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { frozen } = req.body;
    const adminUser = req.user; // Set by authenticate middleware

    const owner = await User.findById(ownerId);
    if (!owner || owner.role !== "owner") {
      return res.status(404).json({ error: "Owner client not found." });
    }

    const previousStatus = owner.accountStatus;
    const previousActive = owner.active;

    owner.accountStatus = frozen ? "frozen" : "active";
    owner.active = !frozen;
    await owner.save();

    await User.updateMany(
      { tenantKey: owner.tenantKey, _id: { $ne: owner._id } },
      { $set: { active: !frozen } }
    );

    // Log the action
    try {
      const action = frozen ? "freeze_client" : "unfreeze_client";

      await AdminAuditLog.create({
        adminId: adminUser?._id,
        adminEmail: adminUser?.email || "admin@gmail.com",
        action,
        targetClientId: owner._id,
        targetClientEmail: owner.email,
        targetClientName: owner.name,
        details: {
          previousValue: { status: previousStatus, active: previousActive },
          newValue: { status: owner.accountStatus, active: owner.active },
          changes: [
            { field: "accountStatus", oldValue: previousStatus, newValue: owner.accountStatus },
            { field: "active", oldValue: previousActive, newValue: owner.active },
          ],
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        status: "success",
      });

      // Create a contact message for audit trail
      await AdminContactMessage.create({
        type: frozen ? "client_frozen" : "account_reactivated",
        clientId: owner._id,
        clientEmail: owner.email,
        clientName: owner.name,
        title: frozen ? `Client ${owner.email} has been frozen` : `Client ${owner.email} has been reactivated`,
        message: frozen
          ? `Admin action: Client workspace frozen by admin. All team members access revoked.`
          : `Admin action: Client workspace reactivated. Team members regain access.`,
        actionUrl: `/admin/users`,
        metadata: {
          previousStatus,
          currentStatus: owner.accountStatus,
        },
      });

      // Send email notification to user
      const { sendAccountStatusEmail } = require("../utils/otpService");
      await sendAccountStatusEmail(
        owner.email,
        owner.name,
        frozen ? "frozen" : "reactivated",
        frozen ? "Your account has been temporarily frozen by the administrator." : "Your account has been reactivated and you can now access all features."
      );
      console.log(`✅ ${frozen ? 'Freeze' : 'Reactivation'} email sent to ${owner.email}`);
    } catch (auditError) {
      console.error("Failed to log freeze/unfreeze action:", auditError);
    }

    return res.json({ message: frozen ? "Client frozen successfully." : "Client unfrozen successfully." });
  } catch (error) {
    console.error("Failed to freeze/unfreeze client:", error);
    return res.status(500).json({ error: error.message || "Failed to update client status." });
  }
};

exports.deleteSaasClient = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const adminUser = req.user; // Set by authenticate middleware

    const owner = await User.findById(ownerId);
    if (!owner || owner.role !== "owner") {
      return res.status(404).json({ error: "Owner client not found." });
    }

    const previousStatus = owner.accountStatus;
    const previousActive = owner.active;
    const ownerEmail = owner.email;
    const ownerName = owner.name;
    const tenantKey = owner.tenantKey;

    // Log the action BEFORE deleting
    try {
      await AdminAuditLog.create({
        adminId: adminUser?._id,
        adminEmail: adminUser?.email || "admin@gmail.com",
        action: "delete_client",
        targetClientId: owner._id,
        targetClientEmail: ownerEmail,
        targetClientName: ownerName,
        details: {
          previousValue: { status: previousStatus, active: previousActive },
          newValue: { status: "deleted", active: false },
          changes: [
            { field: "accountStatus", oldValue: previousStatus, newValue: "deleted" },
            { field: "active", oldValue: previousActive, newValue: false },
          ],
          deletionType: "hard_delete",
          tenantKey: tenantKey,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        status: "success",
      });

      // Create a contact message for audit trail
      await AdminContactMessage.create({
        type: "client_deleted",
        clientId: owner._id,
        clientEmail: ownerEmail,
        clientName: ownerName,
        title: `Client ${ownerEmail} has been permanently deleted`,
        message: `Admin action: Client workspace and all team members permanently deleted from database. This action is irreversible.`,
        actionUrl: `/admin/users`,
        metadata: {
          previousStatus,
          currentStatus: "deleted",
          deletedDate: new Date(),
          deletionType: "hard_delete",
          tenantKey: tenantKey,
        },
      });

      // Send email notification to user BEFORE deleting
      const { sendAccountStatusEmail } = require("../utils/otpService");
      await sendAccountStatusEmail(
        ownerEmail,
        ownerName,
        "deleted",
        "Your account has been permanently deleted by the administrator. All your data has been removed from our system."
      );
      console.log(`✅ Deletion email sent to ${ownerEmail}`);
    } catch (auditError) {
      console.error("Failed to log delete action:", auditError);
    }

    // HARD DELETE: Permanently remove from database
    // Delete all team members first
    const teamMembersDeleted = await User.deleteMany({ 
      tenantKey: tenantKey, 
      _id: { $ne: owner._id } 
    });
    console.log(`🗑️ Deleted ${teamMembersDeleted.deletedCount} team member(s)`);

    // Delete the owner
    await User.findByIdAndDelete(ownerId);
    console.log(`🗑️ Permanently deleted owner: ${ownerEmail}`);

    // Clean up SaasSignup records to allow re-signup
    const signupsDeleted = await SaasSignup.deleteMany({ 
      $or: [
        { ownerUserId: ownerId },
        { email: ownerEmail }
      ]
    });
    console.log(`🗑️ Deleted ${signupsDeleted.deletedCount} signup record(s) for ${ownerEmail}`);

    return res.json({ 
      message: "Client and all team members permanently deleted from database.",
      deletedOwner: ownerEmail,
      deletedTeamMembers: teamMembersDeleted.deletedCount,
      deletedSignupRecords: signupsDeleted.deletedCount,
    });
  } catch (error) {
    console.error("Failed to delete client:", error);
    return res.status(500).json({ error: error.message || "Failed to delete client." });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const { ownerId } = req.query;

    let filter = { paymentStatus: "completed" };
    
    // If ownerId provided, filter by that owner
    if (ownerId) {
      filter.ownerId = ownerId;
    }

    const payments = await SubscriptionPayment.find(filter)
      .sort({ createdAt: -1 })
      .populate("ownerId", "name email accountStatus active")
      .lean();

    // Legacy safety: dedupe records by pidx in case older data contains duplicates.
    const uniqueByPidx = [];
    const seen = new Set();
    for (const payment of payments) {
      const key = payment.pidx || String(payment._id);
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueByPidx.push(payment);
    }

    const now = new Date();
    const enrichedPayments = uniqueByPidx.map(payment => {
      const nextRenewalDate = new Date(payment.subscriptionEndDate);
      const daysUntilRenewal = Math.ceil((nextRenewalDate - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...payment,
        // Ensure ownerId is properly formatted
        ownerId: payment.ownerId || { 
          _id: payment.ownerId, 
          name: payment.ownerName, 
          email: payment.ownerEmail 
        },
        nextRenewalDate,
        daysUntilRenewal,
        isExpired: nextRenewalDate < now,
      };
    });

    return res.json(enrichedPayments);
  } catch (error) {
    console.error("Failed to get payment history:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch payment history." });
  }
};

exports.getOwnerPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Verify user is an owner
    const user = await User.findById(userId);
    if (!user || user.role !== "owner") {
      return res.status(403).json({ error: "Only owners can view their payment history." });
    }

    const payments = await SubscriptionPayment.find({ 
      ownerId: userId,
      paymentStatus: "completed" 
    })
      .sort({ createdAt: -1 })
      .lean();

    // Legacy safety: dedupe records by pidx in case older data contains duplicates.
    const uniqueByPidx = [];
    const seen = new Set();
    for (const payment of payments) {
      const key = payment.pidx || String(payment._id);
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueByPidx.push(payment);
    }

    const now = new Date();
    const enrichedPayments = uniqueByPidx.map(payment => {
      const nextRenewalDate = new Date(payment.subscriptionEndDate);
      const daysUntilRenewal = Math.ceil((nextRenewalDate - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...payment,
        nextRenewalDate,
        daysUntilRenewal,
        isExpired: nextRenewalDate < now,
      };
    });

    return res.json({
      payments: enrichedPayments,
      currentSubscription: {
        expiresAt: user.subscriptionExpiresAt,
        lastPaidAt: user.subscriptionLastPaidAt,
        status: user.accountStatus,
        daysRemaining: user.subscriptionExpiresAt 
          ? Math.ceil((new Date(user.subscriptionExpiresAt) - now) / (1000 * 60 * 60 * 24))
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to get owner payment history:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch payment history." });
  }
};
