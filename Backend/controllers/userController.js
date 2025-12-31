const User = require("../models/User");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const { generateToken } = require("../utils/jwt");

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
      await Notification.create({
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
      return res.status(401).json({ 
        error: "Invalid username or password" 
      });
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
      await Notification.create({
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
