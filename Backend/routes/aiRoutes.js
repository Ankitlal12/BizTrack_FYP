const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { ALL_ROLES } = require("../config/roles");
const { chatReportInsights } = require("../controllers/reportAiController");

const router = express.Router();

router.use(authenticate);
router.use(authorize(...ALL_ROLES));

router.post("/report-chat", chatReportInsights);

module.exports = router;