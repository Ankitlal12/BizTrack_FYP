const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Check if MONGO_URI is set
    if (!process.env.MONGO_URI) {
      console.error("ERROR: MONGO_URI is not set in .env file!");
      console.log("Please create a .env file in the Backend directory with:");
      console.log(" MONGO_URI=mongodb://localhost:27017/biztrack");
      process.exit(1);
    }

    console.log("Attempting to connect to MongoDB...");
    console.log(`Connection String: ${process.env.MONGO_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options help with connection stability
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log("MongoDB Connected Successfully!");
    console.log(`Database: ${conn.connection.name}`);
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Port: ${conn.connection.port}`);
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn("MongoDB disconnected");
    });

    mongoose.connection.on('reconnected', () => {
      console.log(" MongoDB reconnected");
    });

  } catch (error) {
    console.error("MongoDB connection failed!");
    console.error("Error details:", error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.error("\n Possible issues:");
      console.error("   - MongoDB server is not running");
      console.error("   - Incorrect hostname in MONGO_URI");
    } else if (error.message.includes('authentication failed')) {
      console.error("\n Possible issues:");
      console.error("   - Incorrect username or password");
      console.error("   - User doesn't have access to the database");
    } else if (error.message.includes('timeout')) {
      console.error("\n Possible issues:");
      console.error("   - MongoDB server is not accessible");
      console.error("   - Firewall blocking the connection");
      console.error("   - Network connectivity issues");
    }
    
    console.error("\n📖 Please check the setup guide in README_SETUP.md");
    process.exit(1);
  }
};

module.exports = connectDB;
