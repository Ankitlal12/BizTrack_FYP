const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const {
	initiateGoogleSignup,
	verifyGoogleSignupPayment,
	initiateRenewalGoogle,
	verifyRenewalPayment,
	getSaasClients,
	freezeSaasClient,
	deleteSaasClient,
	getPaymentHistory,
	getOwnerPaymentHistory,
} = require("../controllers/saasController");

const router = express.Router();

router.post("/signup/google/initiate", initiateGoogleSignup);
router.post("/signup/google/verify", verifyGoogleSignupPayment);
router.post("/renew/google/initiate", initiateRenewalGoogle);
router.post("/renew/google/verify", verifyRenewalPayment);

router.get("/clients", authenticate, authorize("admin"), getSaasClients);
router.patch("/clients/:ownerId/freeze", authenticate, authorize("admin"), freezeSaasClient);
router.delete("/clients/:ownerId", authenticate, authorize("admin"), deleteSaasClient);

// Payment history routes
router.get("/payments/history", authenticate, authorize("admin"), getPaymentHistory);
router.get("/payments/my-history", authenticate, getOwnerPaymentHistory);

module.exports = router;
