const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");
const Notification = require("../models/Notification");
const Sale = require("../models/Sale");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const { generateToken } = require("../utils/jwt");
const { getNepaliCurrentDateTime } = require("../utils/dateUtils");
const { createNotification } = require("../utils/notificationHelper");

// Create a new user (staff member)
exports.createUser = async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !username || !password) {
      return res.status(400).json({ 
        error: "Name, email, username, and password are required" 
      });
    }

    // Check if user with email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

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
      name,
      email,
      username,
      password: hashedPassword,
      role: role || 'staff',
      active: true,
      dateAdded: new Date(),
    });

    // Create notification for new staff member
    try {
      await createNotification({
        type: "system",
        title: "New Staff Member Added",
        message: `${name} has been added as a ${role || 'staff'} member.`,
        relatedId: user._id,
        relatedModel: "User",
        metadata: {
          userName: name,
          email: email,
          role: role || 'staff',
          username: username,
        },
      });
    } catch (notifError) {
      // Don't fail the user creation if notification fails
      console.error("Failed to create notification:", notifError);
    }

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ dateAdded: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: "Username and password are required" 
      });
    }

    // Find user by username
    const user = await User.findOne({ username });

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

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Record failed login attempt
      try {
        await LoginHistory.create({
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
          type: "login_failed",
          title: "Failed Login Attempt",
          message: `Failed login attempt for user ${user.name} (${username}). IP: ${req.ip || 'Unknown'}`,
          relatedId: user._id,
          relatedModel: "User",
          metadata: {
            userName: user.name,
            username: username,
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

    // Record successful login
    try {
      await LoginHistory.create({
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

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user (username and/or password)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    // Find user
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prepare update object
    const updateData = {};

    // Update username if provided
    if (username !== undefined) {
      if (!username || username.trim() === '') {
        return res.status(400).json({ 
          error: "Username cannot be empty" 
        });
      }

      // Check if new username is already taken by another user
      const existingUser = await User.findOne({ 
        username: username.trim(),
        _id: { $ne: id } // Exclude current user
      });

      if (existingUser) {
        return res.status(400).json({ 
          error: "Username is already taken" 
        });
      }

      updateData.username = username.trim();
    }

    // Update password if provided
    if (password !== undefined) {
      if (!password || password.length < 6) {
        return res.status(400).json({ 
          error: "Password must be at least 6 characters long" 
        });
      }

      // Hash new password
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    // If no updates provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: "No valid fields to update. Provide username and/or password." 
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    // Create notification for security changes
    try {
      let changeDetails = [];
      if (updateData.username) {
        changeDetails.push(`username changed to "${updateData.username}"`);
      }
      if (updateData.password) {
        changeDetails.push('password updated');
      }

      console.log('🔔 Creating security change notification:', {
        type: "security_change",
        title: "Security Settings Changed",
        userName: user.name,
        changes: changeDetails
      });

      const notification = await createNotification({
        type: "security_change",
        title: "Security Settings Changed",
        message: `Security settings for ${user.name} have been updated: ${changeDetails.join(', ')}.`,
        relatedId: user._id,
        relatedModel: "User",
        metadata: {
          userName: user.name,
          email: user.email,
          changes: changeDetails,
          changedAt: new Date(),
        },
      });

      console.log('✅ Security change notification created successfully:', notification.archive._id);
    } catch (notifError) {
      console.error("❌ Failed to create security change notification:", notifError);
      console.error("Error details:", notifError.message);
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

    // Create notification for staff deletion
    try {
      await createNotification({
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

// Google Login
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ 
        error: "Google credential is required" 
      });
    }

    // Get Google Client ID from environment or use the one from frontend
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "905396434192-03aqn8vkab2knh33brep80bfvmh3ojik.apps.googleusercontent.com";
    
    // Verify the Google token
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (verifyError) {
      return res.status(401).json({ 
        error: "Invalid Google token" 
      });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ 
        error: "Email not provided by Google" 
      });
    }

    // Check if user exists by email or googleId
    let user = await User.findOne({
      $or: [{ email }, { googleId }]
    });

    if (user) {
      console.log('Existing user found:', { id: user._id, email: user.email });
      
      // Update user if they logged in with Google before but didn't have googleId
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (picture && user.avatar !== picture) {
        user.avatar = picture;
        updated = true;
      }
      if (updated) {
        await user.save();
        console.log('User updated with Google info');
      }
      
      // Check if user is active
      if (!user.active) {
        return res.status(401).json({ 
          error: "Account is inactive. Please contact administrator." 
        });
      }
    } else {
      // Create new user from Google account
      console.log('Creating new Google user:', { email, name, googleId });
      
      // Generate a unique username from email
      const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      let username = baseUsername || `user${Date.now()}`;
      let counter = 1;
      
      // Ensure username is unique
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
        // Prevent infinite loop
        if (counter > 1000) {
          username = `user${Date.now()}`;
          break;
        }
      }

      try {
        user = await User.create({
          name: name || email.split('@')[0],
          email,
          username,
          googleId,
          avatar: picture,
          role: 'owner', // Default role for Google users
          active: true,
          dateAdded: new Date(),
        });
        
        console.log('New Google user created successfully:', {
          id: user._id,
          email: user.email,
          name: user.name,
        });
      } catch (createError) {
        console.error('Error creating Google user:', createError);
        
        // If creation fails due to duplicate, try to find existing user
        if (createError.code === 11000) {
          user = await User.findOne({
            $or: [{ email }, { googleId }]
          });
          
          if (!user) {
            throw new Error('Failed to create user and user not found');
          }
        } else {
          throw createError;
        }
      }
    }

    // Record successful Google login
    try {
      await LoginHistory.create({
        userId: user._id,
        userName: user.name,
        userRole: user.role,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        loginMethod: "google",
        success: true,
        loginTime: getNepaliCurrentDateTime(),
      });
    } catch (historyError) {
      console.error("Failed to record Google login history:", historyError);
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
    console.error("Google login error:", err);
    res.status(500).json({ error: err.message });
  }
};

// OTP Service imports
const { 
  generateOTP, 
  getOTPExpiration, 
  verifyOTP, 
  sendOTPEmail 
} = require("../utils/otpService");

// Google Login with OTP (Step 1: Verify Google token and send OTP)
exports.googleLoginWithOTP = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ 
        error: "Google credential is required" 
      });
    }

    // Get Google Client ID from environment
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "905396434192-03aqn8vkab2knh33brep80bfvmh3ojik.apps.googleusercontent.com";
    
    // Verify the Google token
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (verifyError) {
      return res.status(401).json({ 
        error: "Invalid Google token" 
      });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ 
        error: "Email not provided by Google" 
      });
    }

    // Check if user exists by email or googleId
    let user = await User.findOne({
      $or: [{ email }, { googleId }]
    });

    if (user) {
      // Update user if they logged in with Google before but didn't have googleId
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (picture && user.avatar !== picture) {
        user.avatar = picture;
        updated = true;
      }
      
      // Check if user is active
      if (!user.active) {
        return res.status(401).json({ 
          error: "Account is inactive. Please contact administrator." 
        });
      }

      if (updated) {
        await user.save();
      }
    } else {
      // Create new user from Google account
      const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      let username = baseUsername || `user${Date.now()}`;
      let counter = 1;
      
      // Ensure username is unique
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
        if (counter > 1000) {
          username = `user${Date.now()}`;
          break;
        }
      }

      user = await User.create({
        name: name || email.split('@')[0],
        email,
        username,
        googleId,
        avatar: picture,
        role: 'owner',
        active: true,
        dateAdded: new Date(),
        twoFactorEnabled: true, // Enable 2FA for new Google users
      });
    }

    // Generate OTP
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
    const emailResult = await sendOTPEmail(email, otp, name);

    if (!emailResult.success) {
      return res.status(500).json({ 
        error: "Failed to send OTP. Please try again." 
      });
    }

    // Return temporary session info (without full token)
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

    // 1. All users
    const allUsers = await User.find({}).select('-password -otp').sort({ dateAdded: -1 });

    // 2. Sales aggregated per staff member — filtered by selected period
    const salesByStaff = await Sale.aggregate([
      {
        $match: {
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


