# 📚 Complete MongoDB Database Setup Guide

## Step-by-Step Instructions

### Step 1: Install MongoDB (Choose One Option)

#### Option A: Install MongoDB Locally (Recommended for Development)

**Windows:**
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Run the installer and follow the setup wizard
3. Choose "Complete" installation
4. Install MongoDB as a Windows Service (recommended)
5. MongoDB will be installed in `C:\Program Files\MongoDB\`

**macOS:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Option B: Use MongoDB Atlas (Cloud - Free Tier Available)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a new cluster (choose FREE tier)
4. Create a database user (username and password)
5. Add your IP address to the whitelist (or use 0.0.0.0/0 for development)
6. Click "Connect" → "Connect your application"
7. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

---

### Step 2: Verify MongoDB is Running

**Windows:**
- Open Services (Win + R, type `services.msc`)
- Look for "MongoDB" service - it should be "Running"

**macOS/Linux:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod
# or
brew services list  # for macOS
```

**Test Connection:**
```bash
# Open MongoDB shell
mongosh
# or older versions
mongo

# You should see: "connecting to: mongodb://127.0.0.1:27017"
# Type: exit to quit
```

---

### Step 3: Create .env File in Backend Directory

1. Navigate to your `Backend` folder
2. Create a new file named `.env` (no extension, just `.env`)
3. Add the following content:

**For Local MongoDB:**
```env
MONGO_URI=mongodb://localhost:27017/biztrack
PORT=5000
```

**For MongoDB Atlas (Cloud):**
```env
MONGO_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/biztrack?retryWrites=true&w=majority
PORT=5000
```

**Important Notes:**
- Replace `your-username` and `your-password` with your actual MongoDB Atlas credentials
- Replace `cluster0.xxxxx.mongodb.net` with your actual cluster address
- The database name `biztrack` will be created automatically if it doesn't exist
- Make sure there are NO spaces around the `=` sign
- Make sure there are NO quotes around the values

---

### Step 4: Install Backend Dependencies

Open terminal/command prompt in the `Backend` directory:

```bash
cd Backend
npm install
```

This will install:
- express
- mongoose
- cors
- dotenv
- and other dependencies

---

### Step 5: Start the Backend Server

```bash
# Start the server
node server.js

# OR use nodemon for auto-restart on file changes
npx nodemon server.js
```

**Expected Output (Success):**
```
🔄 Attempting to connect to MongoDB...
📍 Connection String: mongodb://***:***@localhost:27017/biztrack
✅ MongoDB Connected Successfully!
📊 Database: biztrack
🌐 Host: localhost
🔌 Port: 27017

==================================================
🚀 Server is starting...
🌐 Server running on http://localhost:5000
📡 API Base URL: http://localhost:5000/api
==================================================
```

**If you see errors, check the troubleshooting section below.**

---

### Step 6: Test the Connection

Open your browser or use curl:

```bash
# Test server health
curl http://localhost:5000

# Test database status
curl http://localhost:5000/api/health
```

You should see JSON response showing database connection status.

---

### Step 7: Start the Frontend

In a new terminal, navigate to the Frontend directory:

```bash
cd Frontend
npm install  # if not already done
npm run dev
```

The frontend should now connect to the backend API.

---

## 🔧 Troubleshooting

### Error: "MONGO_URI is not set in .env file"

**Solution:**
1. Make sure `.env` file exists in the `Backend` folder
2. Check the file is named exactly `.env` (not `.env.txt`)
3. Verify the file contains `MONGO_URI=...`
4. Restart the server after creating/modifying `.env`

---

### Error: "MongoDB connection failed" or "ENOTFOUND"

**Possible Causes & Solutions:**

1. **MongoDB is not running:**
   - Windows: Check Services, start MongoDB service
   - macOS: `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`

2. **Wrong connection string:**
   - For local: Use `mongodb://localhost:27017/biztrack`
   - For Atlas: Make sure you copied the full connection string

3. **Firewall blocking:**
   - Check if port 27017 is open (for local MongoDB)
   - For Atlas: Make sure your IP is whitelisted

4. **MongoDB not installed:**
   - Follow Step 1 to install MongoDB

---

### Error: "authentication failed" (MongoDB Atlas)

**Solutions:**
1. Verify username and password in the connection string
2. Make sure the database user has proper permissions
3. Check if your IP address is whitelisted in Atlas
4. Try resetting the database user password in Atlas

---

### Error: "Failed to load inventory" in Frontend

**Possible Causes:**

1. **Backend server not running:**
   - Make sure backend is running on port 5000
   - Check: `http://localhost:5000/api/health`

2. **CORS issues:**
   - Backend should have CORS enabled (already configured)

3. **Wrong API URL:**
   - Frontend defaults to `http://localhost:5000/api`
   - Check browser console for exact error

4. **Database connection issue:**
   - Check backend console for MongoDB connection errors
   - Verify `.env` file is correct

**To Debug:**
1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Try loading inventory
4. Check the failed request and error message
5. Check backend console for errors

---

### Error: "Cannot find module" or "Module not found"

**Solution:**
```bash
cd Backend
npm install
```

Make sure all dependencies are installed.

---

## ✅ Verification Checklist

Before proceeding, verify:

- [ ] MongoDB is installed and running
- [ ] `.env` file exists in `Backend` folder
- [ ] `.env` contains correct `MONGO_URI`
- [ ] Backend dependencies installed (`npm install`)
- [ ] Backend server starts without errors
- [ ] Database connection shows "✅ MongoDB Connected Successfully!"
- [ ] `http://localhost:5000/api/health` returns `{"status":"healthy"}`
- [ ] Frontend can connect to backend

---

## 📞 Quick Test Commands

```bash
# Test MongoDB connection (local)
mongosh
# or
mongo

# Test backend health
curl http://localhost:5000/api/health

# Check if port 5000 is in use
# Windows:
netstat -ano | findstr :5000
# macOS/Linux:
lsof -i :5000
```

---

## 🎯 Next Steps

Once everything is set up:

1. ✅ Backend should show "MongoDB Connected Successfully!"
2. ✅ Visit `http://localhost:5000` to see server status
3. ✅ Visit `http://localhost:5000/api/health` to check database status
4. ✅ Start frontend and test adding inventory items
5. ✅ Check MongoDB to see your data:
   ```bash
   mongosh
   use biztrack
   db.inventories.find()
   ```

---

## 💡 Tips

- Keep the backend terminal open to see connection status
- Check browser console (F12) for frontend errors
- MongoDB Compass (GUI tool) is helpful for viewing data: https://www.mongodb.com/products/compass
- Use `nodemon` for auto-restart during development

---

**Need Help?** Check the error messages in your backend console - they will guide you to the specific issue!

