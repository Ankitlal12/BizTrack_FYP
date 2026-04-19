const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const SaasSignup = require("../models/SaasSignup");
const User = require("../models/User");
const { initiateKhaltiPayment, verifyKhaltiPayment } = require("../utils/khaltiService");
const { generateToken } = require("../utils/jwt");
const { verifyToken, extractTokenFromHeader } = require("../utils/jwt");
const { sendSignupConfirmationEmail } = require("../utils/otpService");

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "905396434192-03aqn8vkab2knh33brep80bfvmh3ojik.apps.googleusercontent.com";

const SAAS_SIGNUP_AMOUNT = Number(process.env.SAAS_SIGNUP_AMOUNT || 999);
const SAAS_SUBSCRIPTION_DAYS = Number(process.env.SAAS_SUBSCRIPTION_DAYS || 30);

const getSubscriptionExpiry = () => {
  const expires = new Date();
  expires.setDate(expires.getDate() + SAAS_SUBSCRIPTION_DAYS);
  return expires;
};

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
    const existingUserQuery = await findExistingOwnerAccount({ email: normalizedEmail, googleId });
    const existingUser = existingUserQuery
      ? await existingUserQuery.select("_id email role active googleId")
      : null;
    if (existingUser) {
      return res.status(409).json({
        error: "This email is already registered. Please log in instead of signing up.",
      });
    }

    const existingSignup = await findExistingSignup({ email: normalizedEmail, googleId });
    if (existingSignup && existingSignup.paymentStatus !== "failed") {
      return res.status(409).json({
        error: "This Google account already has a pending or completed workspace signup. Please log in instead.",
      });
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
          name: "BizTrack SaaS Subscription",
          quantity: 1,
          unit_price: SAAS_SIGNUP_AMOUNT,
          total_price: SAAS_SIGNUP_AMOUNT,
        },
      ],
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

    const verification = await verifyKhaltiPayment(pidx);

    if (!verification.isCompleted) {
      signup.paymentStatus = "failed";
      signup.status = "failed";
      await signup.save();
      return res.status(400).json({ error: verification.message || "Payment not completed." });
    }

    let owner = await User.findOne({
      $or: [{ email: signup.email }, { googleId: signup.googleId }],
    });

    if (!owner) {
      const username = await generateUniqueUsername(signup.email);
      const securePassword = signup.passwordHash || await bcrypt.hash(`${signup.googleId}-${Date.now()}`, 10);

      try {
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
          subscriptionExpiresAt: getSubscriptionExpiry(),
          active: true,
          dateAdded: new Date(),
        });
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
      owner.subscriptionExpiresAt = getSubscriptionExpiry();
      changed = true;
      if (changed) await owner.save();
    }

    if (owner.passwordHash) {
      owner.password = owner.passwordHash;
    }

    signup.paymentStatus = "completed";
    signup.status = "completed";
    signup.ownerUserId = owner._id;
    await signup.save();

    try {
      await sendSignupConfirmationEmail(owner.email, owner.name || signup.ownerName, signup.businessName);
    } catch (emailError) {
      console.error("Failed to send signup confirmation email:", emailError);
    }

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
      purchaseOrderName: `BizTrack Monthly Renewal - ${owner.name}`,
      customerInfo: {
        name: name || owner.name,
        email: normalizedEmail,
        phone: "9800000000",
      },
      productDetails: [
        {
          id: "biztrack-monthly-renewal",
          name: "BizTrack Monthly Renewal",
          quantity: 1,
          unit_price: SAAS_SIGNUP_AMOUNT,
          total_price: SAAS_SIGNUP_AMOUNT,
        },
      ],
      returnUrl: process.env.SAAS_RENEW_RETURN_URL || "http://localhost:5173/signup/payment-success",
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

exports.getSaasClients = async (req, res) => {
  try {
    const owners = await User.find({ role: "owner" }).select("name email active tenantKey subscriptionExpiresAt accountStatus subscriptionLastPaidAt createdAt");

    const result = await Promise.all(
      owners.map(async (owner) => {
        const staffCount = await User.countDocuments({ tenantKey: owner.tenantKey, role: { $in: ["manager", "staff"] } });
        return {
          ...owner.toObject(),
          staffCount,
          subscriptionExpired: owner.subscriptionExpiresAt ? new Date(owner.subscriptionExpiresAt) < new Date() : false,
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

    const owner = await User.findById(ownerId);
    if (!owner || owner.role !== "owner") {
      return res.status(404).json({ error: "Owner client not found." });
    }

    owner.accountStatus = frozen ? "frozen" : "active";
    owner.active = !frozen;
    await owner.save();

    await User.updateMany(
      { tenantKey: owner.tenantKey, _id: { $ne: owner._id } },
      { $set: { active: !frozen } }
    );

    return res.json({ message: frozen ? "Client frozen successfully." : "Client unfrozen successfully." });
  } catch (error) {
    console.error("Failed to freeze/unfreeze client:", error);
    return res.status(500).json({ error: error.message || "Failed to update client status." });
  }
};

exports.deleteSaasClient = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const owner = await User.findById(ownerId);
    if (!owner || owner.role !== "owner") {
      return res.status(404).json({ error: "Owner client not found." });
    }

    await User.updateMany(
      { tenantKey: owner.tenantKey },
      { $set: { accountStatus: "deleted", active: false } }
    );

    return res.json({ message: "Client deleted (soft delete) successfully." });
  } catch (error) {
    console.error("Failed to delete client:", error);
    return res.status(500).json({ error: error.message || "Failed to delete client." });
  }
};
