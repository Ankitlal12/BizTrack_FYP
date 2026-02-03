const LoginHistory = require("../models/LoginHistory");
const { formatNepaliDateTime } = require("../utils/dateUtils");

// Get all login history with pagination
exports.getAllLoginHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, days = 30 } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by user if specified
    if (userId) {
      query.userId = userId;
    }
    
    // Filter by date range (default last 30 days)
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    query.loginTime = { $gte: daysAgo };
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get login history with user details
    const loginHistory = await LoginHistory.find(query)
      .populate("userId", "name email role")
      .sort({ loginTime: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    // Get total count for pagination
    const total = await LoginHistory.countDocuments(query);
    
    // Transform data to include formatted Nepali time
    const transformedHistory = loginHistory.map(entry => ({
      _id: entry._id,
      userId: entry.userId?._id || entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      loginTime: entry.loginTime,
      nepaliTime: formatNepaliDateTime(entry.loginTime),
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      loginMethod: entry.loginMethod,
      success: entry.success,
      createdAt: entry.createdAt,
    }));
    
    res.json({
      loginHistory: transformedHistory,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get login history for a specific user
exports.getUserLoginHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, days = 30 } = req.query;
    
    // Filter by date range
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    
    const query = {
      userId: userId,
      loginTime: { $gte: daysAgo }
    };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const loginHistory = await LoginHistory.find(query)
      .populate("userId", "name email role")
      .sort({ loginTime: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await LoginHistory.countDocuments(query);
    
    const transformedHistory = loginHistory.map(entry => ({
      _id: entry._id,
      userId: entry.userId?._id || entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      loginTime: entry.loginTime,
      nepaliTime: formatNepaliDateTime(entry.loginTime),
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      loginMethod: entry.loginMethod,
      success: entry.success,
      createdAt: entry.createdAt,
    }));
    
    res.json({
      loginHistory: transformedHistory,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Record a new login
exports.recordLogin = async (req, res) => {
  try {
    const {
      userId,
      userName,
      userRole,
      ipAddress,
      userAgent,
      loginMethod = "credentials",
      success = true
    } = req.body;
    
    const loginRecord = await LoginHistory.create({
      userId,
      userName,
      userRole,
      ipAddress,
      userAgent,
      loginMethod,
      success,
    });
    
    res.status(201).json({
      message: "Login recorded successfully",
      loginRecord: {
        ...loginRecord.toObject(),
        nepaliTime: formatNepaliDateTime(loginRecord.loginTime),
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get login statistics
exports.getLoginStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    
    // Total logins in period
    const totalLogins = await LoginHistory.countDocuments({
      loginTime: { $gte: daysAgo },
      success: true
    });
    
    // Failed login attempts
    const failedLogins = await LoginHistory.countDocuments({
      loginTime: { $gte: daysAgo },
      success: false
    });
    
    // Unique users who logged in
    const uniqueUsers = await LoginHistory.distinct("userId", {
      loginTime: { $gte: daysAgo },
      success: true
    });
    
    // Login methods breakdown
    const loginMethods = await LoginHistory.aggregate([
      {
        $match: {
          loginTime: { $gte: daysAgo },
          success: true
        }
      },
      {
        $group: {
          _id: "$loginMethod",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Role-wise login breakdown
    const roleBreakdown = await LoginHistory.aggregate([
      {
        $match: {
          loginTime: { $gte: daysAgo },
          success: true
        }
      },
      {
        $group: {
          _id: "$userRole",
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      totalLogins,
      failedLogins,
      uniqueUsers: uniqueUsers.length,
      loginMethods,
      roleBreakdown,
      period: `Last ${days} days`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};