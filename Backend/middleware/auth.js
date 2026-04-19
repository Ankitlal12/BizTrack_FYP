// ==================== IMPORTS ====================
const { verifyToken, extractTokenFromHeader } = require("../utils/jwt");
const User = require("../models/User");
const WORKSPACE_TENANT_KEY = String(process.env.WORKSPACE_TENANT_KEY || '').trim();

// ==================== HELPERS ====================

/**
 * Extract and verify a JWT token from the request.
 * Supports Authorization header and ?token query param (for sendBeacon).
 * @param {import('express').Request} req
 * @returns {Promise<Object|null>} Decoded user object or null
 */
const resolveUserFromRequest = async (req) => {
  const authHeader = req.headers.authorization;
  let token = extractTokenFromHeader(authHeader);

  // Fallback: query param (sendBeacon compatibility)
  if (!token && req.query.token) token = req.query.token;
  if (!token) return null;

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id).select('-password');
  return user || null;
};

const resolveTenantOwner = async (user) => {
  if (!user) return null;
  if (user.role === "owner") return user;
  if (!user.tenantKey) return null;
  return User.findOne({ tenantKey: user.tenantKey, role: "owner" }).select('-password');
};

const normalizeRequestHost = (req) => {
  const hostHeader = req?.headers?.['x-forwarded-host'] || req?.get?.('host') || '';
  const host = String(hostHeader).split(',')[0].trim().toLowerCase();
  return host.split(':')[0];
};

const isLocalHost = (host = '') => host === 'localhost' || host === '127.0.0.1';

// ==================== MIDDLEWARE ====================

/**
 * Require a valid JWT. Attaches req.user, req.userId, req.userRole.
 * Returns 401 if token is missing, invalid, or the account is inactive.
 */
const authenticate = async (req, res, next) => {
  try {
    const user = await resolveUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ error: "No token provided. Authorization required." });
    }

    if (!user.active) {
      return res.status(401).json({ error: "Account is inactive. Please contact administrator." });
    }

    if (user.role !== "admin") {
      if (WORKSPACE_TENANT_KEY && user.tenantKey !== WORKSPACE_TENANT_KEY) {
        return res.status(403).json({
          error: "This account belongs to another workspace and cannot be used here.",
        });
      }

      const owner = await resolveTenantOwner(user);

      if (!owner) {
        return res.status(403).json({ error: "Workspace owner not found for this account." });
      }

      if (owner.accountStatus === "frozen") {
        return res.status(403).json({ error: "Your account has been freezed. Contact admin." });
      }

      if (owner.accountStatus === "deleted") {
        return res.status(403).json({ error: "Your workspace is deleted and cannot be accessed." });
      }

      if (owner.isSaasCustomer && owner.subscriptionExpiresAt && new Date(owner.subscriptionExpiresAt) < new Date()) {
        return res.status(402).json({ error: "Your monthly subscription has expired. Please renew to continue." });
      }

      const requestHost = normalizeRequestHost(req);
      if (requestHost && !isLocalHost(requestHost) && owner.workspaceHost && owner.workspaceHost !== requestHost) {
        return res.status(403).json({
          error: "This account belongs to another workspace and cannot be used here.",
        });
      }
    }

    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: error.message || "Invalid or expired token" });
  }
};

/**
 * Optional authentication — attaches req.user if a valid token is present,
 * but never blocks the request if it's missing or invalid.
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const user = await resolveUserFromRequest(req);
    if (user?.active) {
      req.user = user;
      req.userId = user._id;
      req.userRole = user.role;
    }
  } catch {
    // Silently continue without auth
  }
  next();
};

/**
 * Role-based authorization. Must be used after `authenticate`.
 * @param {...string} roles - Allowed roles (e.g. 'owner', 'manager')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied. Insufficient permissions." });
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
};
