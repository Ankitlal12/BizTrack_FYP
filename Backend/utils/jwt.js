// ==================== IMPORTS ====================
const jwt = require('jsonwebtoken');

// ==================== CONSTANTS ====================

const JWT_SECRET = process.env.JWT_SECRET || '905396434192-03aqn8vkab2knh33brep80bfvmh3ojik.apps.googleusercontent.com';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// ==================== TOKEN UTILITIES ====================

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with _id/id, email, role
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify a JWT token and return the decoded payload
 * @param {string} token
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Extract the Bearer token from an Authorization header
 * @param {string} authHeader - e.g. "Bearer <token>"
 * @returns {string|null}
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
};
