const express = require("express");
const { 
  createUser, 
  getAllUsers, 
  login, 
  updateUserStatus,
  getUserById,
  googleLogin,
  updateUser,
  deleteUser
} = require("../controllers/userController");
const router = express.Router();

// Create a new user (staff member)
router.post("/add", createUser);

// Login
router.post("/login", login);

// Google Login
router.post("/google-login", googleLogin);

// Get all users
router.get("/", getAllUsers);

// Update user status (activate/deactivate) - more specific route first
router.put("/:id/status", updateUserStatus);

// Get user by ID
router.get("/:id", getUserById);

// Update user (username and/or password)
router.put("/:id", updateUser);

// Delete user
router.delete("/:id", deleteUser);

module.exports = router;
