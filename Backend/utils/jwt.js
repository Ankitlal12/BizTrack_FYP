const jwt = require('jsonwebtoken');

// JWT Secret - should be in environment variable
const JWT_SECRET = process.env.JWT_SECRET || '905396434192-03aqn8vkab2knh33brep80bfvmh3ojik.apps.googleusercontent.com';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d'; //30 days

/**
 * Generate JWT token for user
 * @param {Object} user - User object with id, email, role
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Extract token from Authorization header
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} Token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  
  // Check for "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  return null;
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
};

