# 🚀 Quick Start Guide

## Fast Setup (5 Minutes)

### Step 1: Create .env File

In the `Backend` folder, create a file named `.env` with:

```env
MONGO_URI=mongodb://localhost:27017/biztrack
PORT=5000
```

**For MongoDB Atlas (Cloud):**
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/biztrack
PORT=5000
```

### Step 2: Make Sure MongoDB is Running

**Windows:**
- Open Services (Win + R → `services.msc`)
- Find "MongoDB" → Should be "Running"

**macOS/Linux:**
```bash
# Check status
sudo systemctl status mongod
# or
brew services list
```

### Step 3: Install & Start Backend

```bash
cd Backend
npm install
node server.js
```

**✅ Success looks like:**
```
🔄 Attempting to connect to MongoDB...
✅ MongoDB Connected Successfully!
📊 Database: biztrack
🚀 Server running on http://localhost:5000
```

### Step 4: Test Connection

Open browser: http://localhost:5000/api/health

Should show: `{"status":"healthy","database":{"connected":true}}`

### Step 5: Start Frontend

```bash
cd Frontend
npm install
npm run dev
```

---

## ❌ Common Issues

### "MONGO_URI is not set"
→ Create `.env` file in `Backend` folder

### "MongoDB connection failed"
→ Make sure MongoDB is running (see Step 2)

### "Failed to load inventory"
→ Check backend is running on port 5000
→ Check browser console (F12) for errors

---

## 📖 Full Guide

See `SETUP_GUIDE.md` for detailed instructions.

