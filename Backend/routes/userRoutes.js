const express = require("express");
const { 
  createUser, 
  getAllUsers, 
  login, 
  updateUserStatus,
  getUserById,
  googleLogin,
  googleLoginWithOTP,
  verifyOTPAndLogin,
  resendOTP,
  toggle2FA,
  updateUser,
  deleteUser,
  getStaffAnalytics
} = require("../controllers/userController");
const router = express.Router();

// Create a new user (staff member)
router.post("/add", createUser);

// Login
router.post("/login", login);

// Google Login (without OTP)
router.post("/google-login", googleLogin);

// Google Login with OTP (Step 1: Send OTP)
router.post("/google-login-otp", googleLoginWithOTP);

// Verify OTP and complete login (Step 2: Verify OTP)
router.post("/verify-otp", verifyOTPAndLogin);

// Resend OTP
router.post("/resend-otp", resendOTP);

// Staff analytics (must be before /:id routes)
router.get("/staff-analytics", getStaffAnalytics);

// Toggle 2FA for user
router.put("/:id/toggle-2fa", toggle2FA);

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
