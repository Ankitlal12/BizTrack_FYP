const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_ONLY, OWNER_MANAGER } = require("../config/roles");
const {
  createUser, getAllUsers, login, updateUserStatus, getUserById,
  googleLogin, googleLoginWithOTP, verifyOTPAndLogin, resendOTP,
  toggle2FA, updateUser, deleteUser, getStaffAnalytics,
} = require("../controllers/userController");

const router = express.Router();

// ── Public (no auth required) ──────────────────────────────
router.post("/login",            login);
router.post("/google-login",     googleLogin);
router.post("/google-login-otp", googleLoginWithOTP);
router.post("/verify-otp",       verifyOTPAndLogin);
router.post("/resend-otp",       resendOTP);

// ── Owner only — named routes MUST come before /:id ────────
router.post("/add",              authenticate, authorize(...OWNER_ONLY), createUser);
router.get("/",                  authenticate, authorize(...OWNER_ONLY), getAllUsers);
router.get("/staff-analytics",   authenticate, authorize(...OWNER_ONLY), getStaffAnalytics);

// ── Owner + Manager only ───────────────────────────────────
router.put("/:id/status",        authenticate, authorize(...OWNER_MANAGER), updateUserStatus);

// ── Authenticated: any role (must come after named routes) ─
router.put("/:id/toggle-2fa",    authenticate, toggle2FA);
router.get("/:id",               authenticate, getUserById);
router.put("/:id",               authenticate, updateUser);
router.delete("/:id",            authenticate, authorize(...OWNER_ONLY), deleteUser);

module.exports = router;
