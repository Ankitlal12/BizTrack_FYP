require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { processAllScheduledPayments, processDeliveries } = require("./services/paymentScheduler");
const { sendDailyOwnerSummaryEmail } = require("./utils/notificationHelper");
const Purchase = require("./models/Purchase");

// ==================== APP SETUP ====================
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to DB
connectDB();

// ==================== HEALTH ROUTES ====================
app.get("/", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };
  
  res.json({
    status: "Backend is running smoothly",
    database: {
      status: dbStates[dbStatus] || "unknown",
      connected: dbStatus === 1,
      name: mongoose.connection.name,
      host: mongoose.connection.host
    },
    timestamp: new Date().toISOString()
  });
});

// Database status endpoint
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const isConnected = dbStatus === 1;
  
  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? "healthy" : "unhealthy",
    database: {
      connected: isConnected,
      state: mongoose.connection.readyState,
      name: mongoose.connection.name,
      host: mongoose.connection.host
    }
  });
});

// ==================== ROUTES ====================

// Routes
const userRoutes = require("./routes/userRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const saleRoutes = require("./routes/saleRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const notificationArchiveRoutes = require("./routes/notificationArchiveRoutes");
const billingRoutes = require("./routes/billingRoutes");
const aiRoutes = require("./routes/aiRoutes");
const saasRoutes = require("./routes/saasRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const loginHistoryRoutes = require("./routes/loginHistoryRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const customerRoutes = require("./routes/customerRoutes");
const reorderRoutes = require("./routes/reorderRoutes");

app.use("/api/users", userRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/invoices", invoiceRoutes);
// IMPORTANT: Archive routes must come BEFORE general notification routes
// to prevent /archive from being treated as an ID parameter
app.use("/api/notifications/archive", notificationArchiveRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/saas", saasRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/login-history", loginHistoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/reorders", reorderRoutes);

// ==================== SERVER START ====================

const PORT = process.env.PORT || 5000;

// Start server only after checking environment
if (!process.env.MONGO_URI) {
  console.error("\n CRITICAL: MONGO_URI not found in environment variables!");
  console.error(" Please create a .env file in the Backend directory.");
  console.error("  See README_SETUP.md for detailed instructions.\n");
  process.exit(1);
}

app.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  console.log("Server is starting...");
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  console.log("=".repeat(50) + "\n");

  // Ensure purchase number uniqueness is tenant-scoped.
  Purchase.ensureTenantScopedPurchaseNumberIndex();
  
  // Initialize payment scheduler
  console.log("🔧 Initializing payment scheduler...");

  const scheduleDailyOwnerSummary = () => {
    const DAILY_SUMMARY_HOUR = Number(process.env.DAILY_SUMMARY_HOUR_NPT ?? 23);
    const DAILY_SUMMARY_MINUTE = Number(process.env.DAILY_SUMMARY_MINUTE_NPT ?? 59);
    const TIMEZONE = "Asia/Kathmandu";

    let lastSentDate = null;

    const getNepalDateTimeParts = () => {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const parts = formatter.formatToParts(new Date());
      const getPart = (type) => parts.find((p) => p.type === type)?.value;

      return {
        year: Number(getPart("year")),
        month: Number(getPart("month")),
        day: Number(getPart("day")),
        hour: Number(getPart("hour")),
        minute: Number(getPart("minute")),
        dateKey: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
      };
    };

    const checkAndSend = async () => {
      try {
        const nowNepal = getNepalDateTimeParts();
        const todayKey = nowNepal.dateKey;
        const shouldRunNow = nowNepal.hour > DAILY_SUMMARY_HOUR ||
          (nowNepal.hour === DAILY_SUMMARY_HOUR && nowNepal.minute >= DAILY_SUMMARY_MINUTE);

        if (shouldRunNow && lastSentDate !== todayKey) {
          console.log(`📧 Running daily owner summary at ${new Date().toISOString()} (NPT ${todayKey} ${String(nowNepal.hour).padStart(2, "0")}:${String(nowNepal.minute).padStart(2, "0")})`);
          const result = await sendDailyOwnerSummaryEmail();
          if (result?.skipped) {
            console.warn("⚠️ Daily owner summary skipped: no active owner emails found.");
          }
          lastSentDate = todayKey;
        }
      } catch (error) {
        console.error("❌ Error sending daily owner summary:", error);
      }
    };

    console.log(`🕒 Daily owner summary scheduled for ${String(DAILY_SUMMARY_HOUR).padStart(2, "0")}:${String(DAILY_SUMMARY_MINUTE).padStart(2, "0")} (${TIMEZONE})`);

    // Check every minute so report still sends even if server starts late.
    setInterval(checkAndSend, 60 * 1000);
    setTimeout(checkAndSend, 5000);
  };
  
  // Run payment processor every hour
  setInterval(async () => {
    try {
      console.log(`⏰ Running scheduled payment processor at ${new Date().toISOString()}`);
      await processAllScheduledPayments();
    } catch (error) {
      console.error("❌ Error in scheduled payment processor:", error);
    }
  }, 60 * 60 * 1000); // Run every hour (3600000 ms)

  // Run delivery processor every hour
  setInterval(async () => {
    try {
      console.log(`📦 Running delivery processor at ${new Date().toISOString()}`);
      await processDeliveries();
    } catch (error) {
      console.error("❌ Error in delivery processor:", error);
    }
  }, 60 * 60 * 1000);
  
  // Run once immediately on startup
  setTimeout(async () => {
    try {
      console.log("🚀 Running initial payment & delivery check...");
      await processAllScheduledPayments();
      await processDeliveries();
    } catch (error) {
      console.error("❌ Error in initial processor:", error);
    }
  }, 10000); // Run after 10 seconds to let server fully initialize

  scheduleDailyOwnerSummary();
  
  // console.log("✅ Payment scheduler & delivery processor initialized successfully");
});

