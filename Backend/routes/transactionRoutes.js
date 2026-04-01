const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { OWNER_MANAGER } = require("../config/roles");
const { getTransactions } = require("../controllers/transactionController");

const router = express.Router();

// Transactions require authentication + owner/manager role
router.use(authenticate);
router.use(authorize(...OWNER_MANAGER));

router.get("/", getTransactions);

module.exports = router;
