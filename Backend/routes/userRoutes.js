const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_ONLY, OWNER_MANAGER } = require("../config/roles");
const {
  createUser, getAllUsers, login, updateUserStatus, getUserById,
  googleLogin, googleLoginWithOTP, verifyOTPAndLogin, resendOTP,
  toggle2FA, updateUser, deleteUser, getStaffAnalytics, 
  initializeStaffCredentials, getPendingStaff, fixUsernameIndexes,
  updatePhoneNumber, removePhoneNumber,
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
router.get("/pending-staff",     authenticate, authorize(...OWNER_ONLY), getPendingStaff);
router.post("/:staffId/initialize-credentials", authenticate, authorize(...OWNER_ONLY), initializeStaffCredentials);

// ── Admin only ─────────────────────────────────────────────
router.post("/admin/fix-indexes", authenticate, authorize("admin"), fixUsernameIndexes);

// ── Owner + Manager only ───────────────────────────────────
router.put("/:id/status",        authenticate, authorize(...OWNER_MANAGER), updateUserStatus);

// ── Authenticated: any role (must come after named routes) ─
router.put("/:id/toggle-2fa",    authenticate, toggle2FA);
router.put("/phone/update",      authenticate, updatePhoneNumber);
router.delete("/phone/remove",   authenticate, removePhoneNumber);
router.get("/:id",               authenticate, getUserById);
router.put("/:id",               authenticate, updateUser);
router.delete("/:id",            authenticate, authorize(...OWNER_ONLY), deleteUser);

module.exports = router;
