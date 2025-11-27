# 🔐 MongoDB Atlas Setup with Your Credentials

## Your Credentials (from Atlas Setup)

- **Username:** `np03cs4a230030_db_user`
- **Password:** `ulDoDxr9yX43KHN9`
- **IP Address:** Already added (103.41.173.36) ✅

---

## Step 1: Get Your Cluster Connection String

1. In MongoDB Atlas, click **"Connect"** button on your cluster
2. Choose **"Connect your application"**
3. Select **"Node.js"** as the driver
4. Copy the connection string (it will look like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

---

## Step 2: Create Your .env File

In your `Backend` folder, create a file named `.env` with:

```env
MONGO_URI=mongodb+srv://np03cs4a230030_db_user:ulDoDxr9yX43KHN9@cluster0.xxxxx.mongodb.net/biztrack?retryWrites=true&w=majority
PORT=5000
```

**⚠️ IMPORTANT:**
- Replace `cluster0.xxxxx.mongodb.net` with YOUR actual cluster address from Step 1
- The database name `biztrack` will be created automatically
- Make sure there are NO spaces in the connection string

---

## Step 3: Complete Connection String Format

Your final connection string should look like:

```
mongodb+srv://np03cs4a230030_db_user:ulDoDxr9yX43KHN9@cluster0.xxxxx.mongodb.net/biztrack?retryWrites=true&w=majority
```

**Where:**
- `np03cs4a230030_db_user` = your username
- `ulDoDxr9yX43KHN9` = your password
- `cluster0.xxxxx.mongodb.net` = your cluster address (get from Atlas)
- `biztrack` = database name (will be created automatically)

---

## Step 4: Test the Connection

1. Save the `.env` file
2. Start your backend:
   ```bash
   cd Backend
   npm start
   ```

3. You should see:
   ```
   ✅ MongoDB Connected Successfully!
   📊 Database: biztrack
   ```

---

## 🔍 How to Find Your Cluster Address

1. Go to MongoDB Atlas dashboard
2. Click on your cluster name
3. Click **"Connect"** button
4. Select **"Connect your application"**
5. Copy the connection string shown
6. Replace `<username>` and `<password>` with your credentials

---

## ❌ Common Issues

### "Authentication failed"
- Double-check username and password
- Make sure password doesn't have special characters that need URL encoding

### "IP not whitelisted"
- Your IP (103.41.173.36) is already added ✅
- If you change networks, add your new IP in Atlas → Network Access

### "Connection timeout"
- Check your internet connection
- Verify cluster is running in Atlas dashboard

---

## ✅ Quick Checklist

- [ ] Got cluster connection string from Atlas
- [ ] Created `.env` file in Backend folder
- [ ] Added MONGO_URI with your credentials
- [ ] Replaced cluster address in connection string
- [ ] Saved `.env` file
- [ ] Started backend server
- [ ] Saw "✅ MongoDB Connected Successfully!"

