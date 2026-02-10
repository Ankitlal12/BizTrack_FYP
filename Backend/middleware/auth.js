const { verifyToken, extractTokenFromHeader } = require("../utils/jwt");
const User = require("../models/User");

/**
 * Authentication middleware to verify JWT token
 * Adds user info to req.user if token is valid
 * Supports token from Authorization header or query parameter
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header or query parameter
    const authHeader = req.headers.authorization;
    let token = extractTokenFromHeader(authHeader);
    
    // Fallback to query parameter (for sendBeacon compatibility)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ 
        error: "No token provided. Authorization required." 
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Find user by ID from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ 
        error: "User not found. Invalid token." 
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({ 
        error: "Account is inactive. Please contact administrator." 
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    return res.status(401).json({ 
      error: error.message || "Invalid or expired token" 
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work with or without auth
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.active) {
        req.user = user;
        req.userId = decoded.id;
        req.userRole = decoded.role;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Role-based authorization middleware
 * Must be used after authenticate middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: "Authentication required" 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Access denied. Insufficient permissions." 
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
};

