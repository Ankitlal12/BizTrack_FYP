const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const {
	initiateGoogleSignup,
	verifyGoogleSignupPayment,
	initiateRenewalGoogle,
	getSaasClients,
	freezeSaasClient,
	deleteSaasClient,
} = require("../controllers/saasController");

const router = express.Router();

router.post("/signup/google/initiate", initiateGoogleSignup);
router.post("/signup/google/verify", verifyGoogleSignupPayment);
router.post("/renew/google/initiate", initiateRenewalGoogle);

router.get("/clients", authenticate, authorize("admin"), getSaasClients);
router.patch("/clients/:ownerId/freeze", authenticate, authorize("admin"), freezeSaasClient);
router.delete("/clients/:ownerId", authenticate, authorize("admin"), deleteSaasClient);

module.exports = router;
