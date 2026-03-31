require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { processAllScheduledPayments, processDeliveries } = require("./services/paymentScheduler");

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
  
  // Initialize payment scheduler
  console.log("🔧 Initializing payment scheduler...");
  
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
  
  console.log("✅ Payment scheduler & delivery processor initialized successfully");
});

