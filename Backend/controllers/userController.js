// ==================== IMPORTS ====================
const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");
const Notification = require("../models/Notification");
const Sale = require("../models/Sale");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const { generateToken } = require("../utils/jwt");
const { getNepaliCurrentDateTime } = require("../utils/dateUtils");
const { createNotification } = require("../utils/notificationHelper");
const { generateOTP, getOTPExpiration, verifyOTP, sendOTPEmail, sendCredentialsEmail } = require("../utils/otpService");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAFF_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin123";

// ==================== CONSTANTS ====================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "905396434192-03aqn8vkab2knh33brep80bfvmh3ojik.apps.googleusercontent.com";
const WORKSPACE_TENANT_KEY = String(process.env.WORKSPACE_TENANT_KEY || '').trim();

// ==================== HELPERS ====================

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isPlatformAdmin = (user) => user?.role === "admin";
const resolveTenantKey = (user) => user?.tenantKey || null;
const tenantFilter = (req) => ({ tenantKey: req.user?.tenantKey });

const enforceTenantScope = (targetUser, requester) => {
  if (isPlatformAdmin(requester)) return true;
  const requesterTenant = resolveTenantKey(requester);
  return Boolean(requesterTenant && targetUser?.tenantKey === requesterTenant);
};

const isStrongStaffPassword = (password) =>
  typeof password === "string" &&
  password.length >= 6 &&
  STAFF_PASSWORD_REGEX.test(password);

const resolveTenantOwner = async (user) => {
  if (!user) return null;
  if (user.role === "owner") return user;
  if (!user.tenantKey) return null;
  return User.findOne({ tenantKey: user.tenantKey, role: "owner" });
};

const normalizeRequestHost = (req) => {
  const hostHeader = req?.headers?.['x-forwarded-host'] || req?.get?.('host') || '';
  const host = String(hostHeader).split(',')[0].trim().toLowerCase();
  return host.split(':')[0];
};

const isLocalHost = (host = '') => host === 'localhost' || host === '127.0.0.1';

const ensureWorkspaceLoginAllowed = async (user, req) => {
  if (!user || user.role === "admin") return;

  if (WORKSPACE_TENANT_KEY && user.tenantKey !== WORKSPACE_TENANT_KEY) {
    throw {
      status: 403,
      message: "This account belongs to another workspace and cannot be used here.",
    };
  }

  const owner = await resolveTenantOwner(user);
  if (!owner) {
    throw { status: 403, message: "Workspace owner not found for this account." };
  }

  if (owner.accountStatus === "frozen") {
    throw { status: 403, message: "Your account has been freezed. Contact admin." };
  }

  if (owner.accountStatus === "deleted") {
    throw { status: 403, message: "Your workspace is deleted and cannot be accessed." };
  }

  if (owner.isSaasCustomer && owner.subscriptionExpiresAt && new Date(owner.subscriptionExpiresAt) < new Date()) {
    throw { status: 402, message: "Your monthly subscription has expired. Please renew to continue." };
  }

  const requestHost = normalizeRequestHost(req);
  if (!requestHost || isLocalHost(requestHost)) {
    return;
  }

  if (owner.workspaceHost && owner.workspaceHost !== requestHost) {
    throw {
      status: 403,
      message: "This account belongs to another workspace and cannot be used here.",
    };
  }

  if (!owner.workspaceHost && owner.role === 'owner') {
    owner.workspaceHost = requestHost;
    await owner.save();
  }
};

// Verify a Google ID token and return the payload
const verifyGoogleToken = async (credential) => {
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
  return ticket.getPayload();
};

// Find or create a user from Google OAuth payload
const findOrCreateGoogleUser = async (googleId, email, name, picture) => {
  let user = await User.findOne({ $or: [{ email }, { googleId }] });

  if (user) {
    let updated = false;
    if (!user.googleId) { user.googleId = googleId; updated = true; }
    if (picture && user.avatar !== picture) { user.avatar = picture; updated = true; }
    if (updated) await user.save();
    return user;
  }

  // Generate unique username
  const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  let username = baseUsername || `user${Date.now()}`;
  let counter = 1;
  while (await User.findOne({ username })) {
    username = `${baseUsername}${counter++}`;
    if (counter > 1000) { username = `user${Date.now()}`; break; }
  }

  return User.create({
    name: name || email.split('@')[0],
    email,
    username,
    googleId,
    avatar: picture,
    role: 'owner',
    tenantKey: `tenant_${Date.now()}`,
    active: true,
    dateAdded: new Date(),
  });
};

// Record a login history entry
const recordLoginHistory = async (user, req, method, success) => {
  try {
    await LoginHistory.create({
      tenantKey: user.tenantKey,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      loginMethod: method,
      success,
      loginTime: getNepaliCurrentDateTime(),
    });
  } catch (err) {
    console.error("Failed to record login history:", err);
  }
};

// ==================== USER CRUD ENDPOINTS ====================

// Create a new user (staff member)
exports.createUser = async (req, res) => {
  try {
    const { name, email, username, password, role, sendCredentialsEmail: shouldSendCredentials } = req.body;

    const trimmedName = (name || "").trim();
    const normalizedEmail = (email || "").trim().toLowerCase();
    const trimmedUsername = (username || "").trim();

    // Validate required fields
    if (!trimmedName || !normalizedEmail || !trimmedUsername || !password) {
      return res.status(400).json({ 
        error: "Name, email, username, and password are required" 
      });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (normalizedEmail.endsWith('.con') || normalizedEmail.endsWith('.cmo')) {
      return res.status(400).json({ error: "Email domain looks invalid. Did you mean .com?" });
    }

    if (normalizedEmail.includes('@gmail.') && !normalizedEmail.endsWith('@gmail.com')) {
      return res.status(400).json({ error: "Gmail address must end with @gmail.com" });
    }

    if (!isStrongStaffPassword(password)) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long and include at least one letter, one number, and one special character",
      });
    }

    const tenantKey = resolveTenantKey(req.user);
    if (!tenantKey && !isPlatformAdmin(req.user)) {
      return res.status(403).json({ error: "No workspace context found for this owner." });
    }

    // Check if user with email or username already exists
    const existingFilter = isPlatformAdmin(req.user)
      ? { $or: [{ email: normalizedEmail }, { username: trimmedUsername }] }
      : {
          tenantKey,
          $or: [{ email: normalizedEmail }, { username: trimmedUsername }],
        };

    const existingUser = await User.findOne(existingFilter);

    if (existingUser) {
      return res.status(400).json({ 
        error: "User with this email or username already exists" 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      username: trimmedUsername,
      password: hashedPassword,
      role: role || 'staff',
      tenantKey: isPlatformAdmin(req.user)
        ? (req.body.tenantKey || null)
        : tenantKey,
      active: true,
      dateAdded: new Date(),
    });

    let credentialEmailSent = false;
    if (shouldSendCredentials) {
      const emailResult = await sendCredentialsEmail(
        normalizedEmail,
        trimmedName,
        trimmedUsername,
        password,
        role || 'staff'
      );
      credentialEmailSent = !!emailResult.success;

      if (!credentialEmailSent) {
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({
          error: "User was not created because credential email could not be sent. Please verify email settings and try again.",
        });
      }
    }

    // Create notification for new staff member
    try {
      await createNotification({
        tenantKey: req.user.tenantKey,
        type: "system",
        title: "New Staff Member Added",
        message: `${trimmedName} has been added as a ${role || 'staff'} member.`,
        relatedId: user._id,
        relatedModel: "User",
        metadata: {
          userName: trimmedName,
          email: normalizedEmail,
          role: role || 'staff',
          username: trimmedUsername,
          credentialEmailSent,
        },
      });
    } catch (notifError) {
      // Don't fail the user creation if notification fails
      console.error("Failed to create notification:", notifError);
    }

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      ...userResponse,
      credentialEmailSent,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const filter = isPlatformAdmin(req.user)
      ? {}
      : { tenantKey: resolveTenantKey(req.user) };
    const users = await User.find(filter).select('-password').sort({ dateAdded: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== AUTH ENDPOINTS ====================

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const loginIdentifier = (username || "").trim();
    const normalizedIdentifier = loginIdentifier.toLowerCase();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ 
        error: "Email/username and password are required" 
      });
    }

    // Static admin bootstrap credentials requested by product requirement.
    if (normalizedIdentifier === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      let adminUser = await User.findOne({ email: ADMIN_EMAIL });

      if (!adminUser) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);
        adminUser = await User.create({
          name: "System Admin",
          email: ADMIN_EMAIL,
          username: "admin",
          password: hashedPassword,
          role: "admin",
          active: true,
          dateAdded: new Date(),
        });
      } else {
        let changed = false;
        if (adminUser.role !== "admin") {
          adminUser.role = "admin";
          changed = true;
        }
        if (!adminUser.active) {
          adminUser.active = true;
          changed = true;
        }
        if (changed) await adminUser.save();
      }

      await recordLoginHistory(adminUser, req, "credentials", true);
      const adminToken = generateToken(adminUser);
      const adminResponse = adminUser.toObject();
      delete adminResponse.password;

      return res.json({
        user: adminResponse,
        token: adminToken,
      });
    }

    // Find user by assigned username or assigned email.
    const identifierRegex = new RegExp(`^${escapeRegExp(loginIdentifier)}$`, "i");
    const matchedUsers = await User.find({
      $or: [
        { username: identifierRegex },
        { email: identifierRegex },
      ],
    }).limit(5);

    if (matchedUsers.length > 1) {
      return res.status(409).json({
        error: "Multiple accounts matched this login ID. Please contact admin to resolve duplicate usernames.",
      });
    }

    const user = matchedUsers[0];

    if (!user) {
      return res.status(401).json({ 
        error: "Invalid username or password" 
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({ 
        error: "Account is inactive. Please contact administrator." 
      });
    }

    try {
      await ensureWorkspaceLoginAllowed(user, req);
    } catch (workspaceError) {
      return res.status(workspaceError.status || 403).json({
        error: workspaceError.message || "Workspace login is not allowed.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Record failed login attempt
      try {
        await LoginHistory.create({
          tenantKey: user.tenantKey,
          userId: user._id,
          userName: user.name,
          userRole: user.role,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          loginMethod: "credentials",
          success: false,
          loginTime: getNepaliCurrentDateTime(),
        });

        console.log('🔔 Creating failed login notification for user:', user.name);

        // Create notification for failed login attempt
        const notification = await createNotification({
          tenantKey: user.tenantKey,
          type: "login_failed",
          title: "Failed Login Attempt",
          message: `Failed login attempt for user ${user.name} (${loginIdentifier}). IP: ${req.ip || 'Unknown'}`,
          relatedId: user._id,
          relatedModel: "User",
          metadata: {
            userName: user.name,
            username: loginIdentifier,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            timestamp: new Date(),
          },
        });

        console.log('✅ Failed login notification created successfully:', notification.archive._id);
      } catch (historyError) {
        console.error("❌ Failed to record failed login:", historyError);
        console.error("Error details:", historyError.message);
      }
      
      return res.status(401).json({ 
        error: "Invalid username or password" 
      });
    }

    // Ensure owners have a tenant workspace key for multi-tenant scoping.
    if (user.role === 'owner' && !user.tenantKey) {
      user.tenantKey = `tenant_${user._id}`;
      await user.save();
    }

    // Record successful login
    try {
      await LoginHistory.create({
        tenantKey: user.tenantKey,
        userId: user._id,
        userName: user.name,
        userRole: user.role,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        loginMethod: "credentials",
        success: true,
        loginTime: getNepaliCurrentDateTime(),
      });
    } catch (historyError) {
      console.error("Failed to record login history:", historyError);
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return user without password and token
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      user: userResponse,
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user status (activate/deactivate)
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ 
        error: "Active status must be a boolean value" 
      });
    }

    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!enforceTenantScope(existingUser, req.user)) {
      return res.status(403).json({ error: "Access denied for this workspace user." });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { active },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!enforceTenantScope(user, req.user)) {
      return res.status(403).json({ error: "Access denied for this workspace user." });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user (username and/or password)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!enforceTenantScope(user, req.user)) {
      return res.status(403).json({ error: "Access denied for this workspace user." });
    }

    // Owners cannot have their role changed through this endpoint
    if (user.role === 'owner') {
      return res.status(403).json({ error: "Owner role cannot be changed." });
    }

    const updateData = {};

    // Update username if provided
    if (username !== undefined) {
      if (!username || username.trim() === '') {
        return res.status(400).json({ error: "Username cannot be empty" });
      }
      const existingUser = await User.findOne({
        username: username.trim(),
        _id: { $ne: id },
        ...(isPlatformAdmin(req.user) ? {} : { tenantKey: resolveTenantKey(req.user) }),
      });
      if (existingUser) {
        return res.status(400).json({ error: "Username is already taken" });
      }
      updateData.username = username.trim();
    }

    // Update password if provided
    if (password !== undefined) {
      if (!isStrongStaffPassword(password)) {
        return res.status(400).json({
          error: "Password must be at least 6 characters long and include at least one letter, one number, and one special character",
        });
      }
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    // Update role if provided — only staff <-> manager swaps allowed
    if (role !== undefined) {
      const allowedRoles = ['staff', 'manager'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: "Role must be 'staff' or 'manager'." });
      }
      updateData.role = role;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');

    // Notification
    try {
      const changeDetails = [];
      if (updateData.username) changeDetails.push(`username changed to "${updateData.username}"`);
      if (updateData.password) changeDetails.push('password updated');
      if (updateData.role) changeDetails.push(`role changed to "${updateData.role}"`);

      await createNotification({
        tenantKey: req.user.tenantKey,
        type: updateData.role ? "system" : "security_change",
        title: updateData.role ? "User Role Changed" : "Security Settings Changed",
        message: `${user.name} has been updated: ${changeDetails.join(', ')}.`,
        relatedId: user._id,
        relatedModel: "User",
        metadata: { userName: user.name, email: user.email, changes: changeDetails, changedAt: new Date() },
      });
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user before deletion to get their info
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!enforceTenantScope(user, req.user)) {
      return res.status(403).json({ error: "Access denied for this workspace user." });
    }

    // Create notification for staff deletion
    try {
      await createNotification({
        tenantKey: user.tenantKey,
        type: "system",
        title: "Staff Member Deleted",
        message: `${user.name} (${user.email}) has been removed from the system.`,
        relatedId: user._id,
        relatedModel: "User",
        metadata: {
          userName: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
        },
      });
    } catch (notifError) {
      // Don't fail the deletion if notification fails
      console.error("Failed to create notification:", notifError);
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.json({ 
      message: "User deleted successfully",
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== GOOGLE AUTH ENDPOINTS ====================

// Google Login (direct — no OTP)
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Google credential is required" });

    let payload;
    try {
      payload = await verifyGoogleToken(credential);
    } catch {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const { sub: googleId, email, name, picture } = payload;
    if (!email) return res.status(400).json({ error: "Email not provided by Google" });

    let user;
    try {
      user = await findOrCreateGoogleUser(googleId, email, name, picture);
    } catch (createError) {
      if (createError.code === 11000) {
        user = await User.findOne({ $or: [{ email }, { googleId }] });
        if (!user) throw new Error('Failed to create user and user not found');
      } else {
        throw createError;
      }
    }

    if (!user.active) return res.status(401).json({ error: "Account is inactive. Please contact administrator." });

    try {
      await ensureWorkspaceLoginAllowed(user, req);
    } catch (workspaceError) {
      return res.status(workspaceError.status || 403).json({
        error: workspaceError.message || "Workspace login is not allowed.",
      });
    }

    await recordLoginHistory(user, req, "google", true);
    const token = generateToken(user);
    const userResponse = user.toObject();
    delete userResponse.password;
    res.json({ user: userResponse, token });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==================== OTP ENDPOINTS ====================

// Google Login with OTP (Step 1: Verify Google token and send OTP)
exports.googleLoginWithOTP = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Google credential is required" });

    let payload;
    try {
      payload = await verifyGoogleToken(credential);
    } catch {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const { sub: googleId, email, name, picture } = payload;
    if (!email) return res.status(400).json({ error: "Email not provided by Google" });

    const user = await findOrCreateGoogleUser(googleId, email, name, picture);
    if (!user.active) return res.status(401).json({ error: "Account is inactive. Please contact administrator." });

    try {
      await ensureWorkspaceLoginAllowed(user, req);
    } catch (workspaceError) {
      return res.status(workspaceError.status || 403).json({
        error: workspaceError.message || "Workspace login is not allowed.",
      });
    }

    // Generate and save OTP
    const otp = generateOTP();
    const otpExpiration = getOTPExpiration();
    user.otp = { code: otp, expiresAt: otpExpiration, verified: false };
    await user.save();

    const emailResult = await sendOTPEmail(email, otp, name);
    if (!emailResult.success) return res.status(500).json({ error: "Failed to send OTP. Please try again." });

    res.json({
      message: "OTP sent successfully",
      requiresOTP: true,
      userId: user._id,
      email: user.email,
      name: user.name,
      expiresAt: otpExpiration,
    });
  } catch (err) {
    console.error("Google login with OTP error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Verify OTP and complete login (Step 2: Verify OTP)
exports.verifyOTPAndLogin = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ 
        error: "User ID and OTP are required" 
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        error: "User not found" 
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({ 
        error: "Account is inactive. Please contact administrator." 
      });
    }

    try {
      await ensureWorkspaceLoginAllowed(user, req);
    } catch (workspaceError) {
      return res.status(workspaceError.status || 403).json({
        error: workspaceError.message || "Workspace login is not allowed.",
      });
    }

    // Verify OTP
    const verification = verifyOTP(
      user.otp?.code,
      otp,
      user.otp?.expiresAt
    );

    if (!verification.valid) {
      return res.status(401).json({ 
        error: verification.message 
      });
    }

    // Mark OTP as verified and clear it
    user.otp = {
      code: null,
      expiresAt: null,
      verified: true,
    };
    await user.save();

    // Record successful login
    try {
      await LoginHistory.create({
        tenantKey: user.tenantKey,
        userId: user._id,
        userName: user.name,
        userRole: user.role,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        loginMethod: "google_otp",
        success: true,
        loginTime: getNepaliCurrentDateTime(),
      });
    } catch (historyError) {
      console.error("Failed to record login history:", historyError);
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return user without password and token
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.otp;

    res.json({
      user: userResponse,
      token,
      message: "Login successful",
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: "User ID is required" 
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        error: "User not found" 
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({ 
        error: "Account is inactive. Please contact administrator." 
      });
    }

    try {
      await ensureWorkspaceLoginAllowed(user, req);
    } catch (workspaceError) {
      return res.status(workspaceError.status || 403).json({
        error: workspaceError.message || "Workspace login is not allowed.",
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiration = getOTPExpiration();

    // Save OTP to user
    user.otp = {
      code: otp,
      expiresAt: otpExpiration,
      verified: false,
    };
    await user.save();

    // Send OTP via email
    const emailResult = await sendOTPEmail(user.email, otp, user.name);

    if (!emailResult.success) {
      return res.status(500).json({ 
        error: "Failed to send OTP. Please try again." 
      });
    }

    res.json({
      message: "OTP resent successfully",
      expiresAt: otpExpiration,
    });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Toggle 2FA for user
exports.toggle2FA = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        error: "Enabled status must be a boolean value" 
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { twoFactorEnabled: enabled },
      { new: true }
    ).select('-password -otp');

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== ANALYTICS ENDPOINTS ====================

// Staff Analytics - comprehensive performance metrics for all staff
exports.getStaffAnalytics = async (req, res) => {
  try {
    const { days = 30, dateFrom, dateTo } = req.query;
    let startDate, endDate;
    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
    }
    const daysAgo = startDate; // alias for existing code
    const scope = tenantFilter(req);

    if (!scope.tenantKey) {
      return res.status(400).json({ error: "Tenant key is required for staff analytics" });
    }

    // 1. All users
    const allUsers = await User.find(scope).select('-password -otp').sort({ dateAdded: -1 });

    // 2. Sales aggregated per staff member — filtered by selected period
    const salesByStaff = await Sale.aggregate([
      {
        $match: {
          tenantKey: scope.tenantKey,
          'createdBy.userId': { $exists: true, $ne: null },
          createdAt: { $gte: startDate, $lte: endDate },
        }
      },
      {
        $group: {
          _id: '$createdBy.userId',
          staffName: { $first: '$createdBy.name' },
          staffRole: { $first: '$createdBy.role' },
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          lastSaleDate: { $max: '$createdAt' },
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // 3. Session analytics per staff — filtered by selected period
    const sessionByStaff = await LoginHistory.aggregate([
      {
        $match: {
          tenantKey: scope.tenantKey,
          success: true,
          loginTime: { $gte: startDate, $lte: endDate },
        }
      },
      {
        $group: {
          _id: '$userId',
          totalSessions: { $sum: 1 },
          totalSessionDuration: { $sum: '$sessionDuration' },
          avgSessionDuration: { $avg: '$sessionDuration' },
          lastLogin: { $max: '$loginTime' },
        }
      }
    ]);

    // 4. Login activity over time (last N days) for chart
    const loginActivity = await LoginHistory.aggregate([
      {
        $match: {
          tenantKey: scope.tenantKey,
          success: true,
          loginTime: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$loginTime' } },
            userId: '$userId'
          },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // 5. Daily sales trend over selected period
    const dailySalesByStaff = await Sale.aggregate([
      {
        $match: {
          tenantKey: scope.tenantKey,
          'createdBy.userId': { $exists: true, $ne: null },
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          },
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Build maps for quick lookup
    const salesMap = new Map(salesByStaff.map(s => [s._id.toString(), s]));
    const sessionMap = new Map(sessionByStaff.map(s => [s._id.toString(), s]));

    // Build combined staff performance data
    const staffPerformance = allUsers.map(user => {
      const uid = user._id.toString();
      const sales = salesMap.get(uid) || {};
      const session = sessionMap.get(uid) || {};

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        active: user.active,
        avatar: user.avatar,
        dateAdded: user.dateAdded,
        // Period-filtered sales
        totalSales: sales.totalSales || 0,
        totalRevenue: sales.totalRevenue || 0,
        avgOrderValue: sales.avgOrderValue || 0,
        lastSaleDate: sales.lastSaleDate || null,
        // Period-filtered sessions
        totalSessions: session.totalSessions || 0,
        totalSessionDuration: session.totalSessionDuration || 0,
        avgSessionDuration: session.avgSessionDuration || 0,
        lastLogin: session.lastLogin || null,
      };
    });

    // Overview stats
    const totalStaff = allUsers.length;
    const activeStaff = allUsers.filter(u => u.active).length;
    const byRole = {
      owner: allUsers.filter(u => u.role === 'owner').length,
      manager: allUsers.filter(u => u.role === 'manager').length,
      staff: allUsers.filter(u => u.role === 'staff').length,
    };

    const topSeller = staffPerformance
      .filter(s => s.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)[0] || null;

    const mostTimeSpent = staffPerformance
      .filter(s => s.totalSessionDuration > 0)
      .sort((a, b) => b.totalSessionDuration - a.totalSessionDuration)[0] || null;

    const mostSessions = staffPerformance
      .filter(s => s.totalSessions > 0)
      .sort((a, b) => b.totalSessions - a.totalSessions)[0] || null;

    res.json({
      overview: {
        totalStaff,
        activeStaff,
        inactiveStaff: totalStaff - activeStaff,
        byRole,
        topSeller: topSeller ? { name: topSeller.name, revenue: topSeller.totalRevenue, sales: topSeller.totalSales } : null,
        mostTimeSpent: mostTimeSpent ? { name: mostTimeSpent.name, duration: mostTimeSpent.totalSessionDuration, sessions: mostTimeSpent.totalSessions } : null,
        mostSessions: mostSessions ? { name: mostSessions.name, sessions: mostSessions.totalSessions } : null,
      },
      staffPerformance,
      loginActivity,
      dailySalesByStaff,
      period: parseInt(days),
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


