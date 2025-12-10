const User = require("../models/User");
const bcrypt = require("bcryptjs");

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

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
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
