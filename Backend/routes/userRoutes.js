const express = require("express");
const { 
  createUser, 
  getAllUsers, 
  login, 
  updateUserStatus,
  getUserById,
  googleLogin
} = require("../controllers/userController");
const router = express.Router();

// Create a new user (staff member)
router.post("/add", createUser);

// Get all users
router.get("/", getAllUsers);

// Get user by ID
router.get("/:id", getUserById);

// Login
router.post("/login", login);

// Google Login
router.post("/google-login", googleLogin);

// Update user status (activate/deactivate)
router.put("/:id/status", updateUserStatus);

module.exports = router;
