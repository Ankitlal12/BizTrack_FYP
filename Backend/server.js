const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to DB
connectDB();

// Health check route with database status
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

// Routes
const userRoutes = require("./routes/userRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const saleRoutes = require("./routes/saleRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

app.use("/api/users", userRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/notifications", notificationRoutes);

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
});

