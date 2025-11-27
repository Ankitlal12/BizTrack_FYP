# 📋 Database Setup - Step by Step

## ✅ What You'll See When It Works

When everything is set up correctly, your backend console will show:

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

---

## 📝 Step-by-Step Instructions

### STEP 1: Install MongoDB

**Option A: Local Installation (Recommended)**

1. Download: https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB will run as a Windows Service automatically

**Option B: MongoDB Atlas (Cloud - Free)**

1. Sign up: https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user
4. Get connection string

---

### STEP 2: Create .env File

1. Go to `Backend` folder
2. Create new file named `.env` (NOT `.env.txt`)
3. Copy and paste this:

**For Local MongoDB:**
```
MONGO_URI=mongodb://localhost:27017/biztrack
PORT=5000
```

**For MongoDB Atlas:**
```
MONGO_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/biztrack?retryWrites=true&w=majority
PORT=5000
```

⚠️ **IMPORTANT:**
- Replace `your-username` and `your-password` with real values
- No spaces around `=`
- No quotes needed

---

### STEP 3: Verify MongoDB is Running

**Windows:**
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find "MongoDB" in the list
4. Status should be "Running"

If not running:
- Right-click → Start

**Test in Command Prompt:**
```bash
mongosh
# Should connect successfully
# Type: exit
```

---

### STEP 4: Install Dependencies

Open terminal in `Backend` folder:

```bash
npm install
```

Wait for installation to complete.

---

### STEP 5: Start Backend Server

```bash
npm start
```

**OR for auto-restart on changes:**
```bash
npm run dev
```

---

### STEP 6: Verify Connection

**Option 1: Check Console Output**
Look for: `✅ MongoDB Connected Successfully!`

**Option 2: Test in Browser**
Open: http://localhost:5000

Should see:
```json
{
  "status": "Backend is running smoothly",
  "database": {
    "status": "connected",
    "connected": true,
    "name": "biztrack",
    "host": "localhost"
  }
}
```

**Option 3: Health Check**
Open: http://localhost:5000/api/health

Should see:
```json
{
  "status": "healthy",
  "database": {
    "connected": true
  }
}
```

---

### STEP 7: Start Frontend

Open a NEW terminal:

```bash
cd Frontend
npm install  # if not done already
npm run dev
```

---

### STEP 8: Test in Frontend

1. Open browser to frontend URL (usually http://localhost:5173)
2. Login
3. Go to Inventory page
4. Click "Add Item"
5. Fill form and save
6. Item should appear in the list

---

## ❌ Troubleshooting "Failed to Load Inventory"

### Check 1: Is Backend Running?

Look at backend terminal - should show:
- ✅ MongoDB Connected Successfully!
- 🚀 Server running on http://localhost:5000

**If not:**
- Check for error messages
- Verify `.env` file exists
- Make sure MongoDB is running

---

### Check 2: Test Backend API

Open browser: http://localhost:5000/api/inventory

**Should see:** `[]` (empty array) or list of items

**If you see error:**
- Check backend console for details
- Verify database connection

---

### Check 3: Check Browser Console

1. Open frontend in browser
2. Press `F12` (Developer Tools)
3. Go to "Console" tab
4. Look for red error messages

**Common Errors:**

**"Failed to fetch" or "NetworkError"**
→ Backend server is not running
→ Solution: Start backend with `npm start`

**"Database not connected"**
→ MongoDB is not running or wrong connection string
→ Solution: Check MongoDB service and `.env` file

---

### Check 4: Verify .env File

1. Go to `Backend` folder
2. Make sure `.env` file exists
3. Open it and verify:
   - `MONGO_URI=...` is present
   - No typos
   - Correct connection string

**Common Mistakes:**
- File named `.env.txt` instead of `.env`
- Missing `MONGO_URI=`
- Wrong MongoDB connection string
- Spaces around `=`

---

### Check 5: MongoDB Connection

**Test MongoDB directly:**

```bash
mongosh
# or
mongo
```

If this fails, MongoDB is not installed or not running.

---

## 🎯 Quick Verification Checklist

Before testing, verify:

- [ ] MongoDB is installed
- [ ] MongoDB service is running (Windows Services)
- [ ] `.env` file exists in `Backend` folder
- [ ] `.env` contains `MONGO_URI=...`
- [ ] Backend dependencies installed (`npm install`)
- [ ] Backend server started (`npm start`)
- [ ] Backend shows "✅ MongoDB Connected Successfully!"
- [ ] http://localhost:5000/api/health shows `{"status":"healthy"}`
- [ ] Frontend can access backend (check browser console)

---

## 📞 Still Having Issues?

1. **Check Backend Console** - Look for error messages
2. **Check Browser Console** (F12) - Look for network errors
3. **Test API Directly** - http://localhost:5000/api/inventory
4. **Verify MongoDB** - Run `mongosh` to test connection
5. **Check .env File** - Make sure it's correct

---

## 💡 Pro Tips

- Keep backend terminal open to see connection status
- Use `npm run dev` for auto-restart during development
- Check both backend AND frontend consoles for errors
- MongoDB Compass (GUI) helps visualize your data

---

**Need more help?** See `SETUP_GUIDE.md` for detailed troubleshooting.

