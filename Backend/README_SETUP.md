# MongoDB Database Setup Guide

## Prerequisites
- MongoDB installed locally OR MongoDB Atlas account
- Node.js and npm installed

## Setup Instructions

### 1. Create a `.env` file in the Backend directory

Create a file named `.env` in the `Backend` folder with the following content:

```
MONGO_URI=mongodb://localhost:27017/biztrack
PORT=5000
```

**For MongoDB Atlas (Cloud):**
Replace `MONGO_URI` with your MongoDB Atlas connection string:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/biztrack
```

### 2. Install Dependencies

Make sure all dependencies are installed:
```bash
cd Backend
npm install
```

### 3. Start the Backend Server

```bash
npm start
# or with nodemon for auto-restart
npx nodemon server.js
```

The server should connect to MongoDB and start on port 5000.

## API Endpoints

All data is now stored in MongoDB. The following endpoints are available:

### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get single inventory item
- `POST /api/inventory` - Create new inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create new sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale

### Purchases
- `GET /api/purchases` - Get all purchases
- `POST /api/purchases` - Create new purchase
- `PUT /api/purchases/:id` - Update purchase
- `DELETE /api/purchases/:id` - Delete purchase

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

## Frontend Configuration

The frontend is configured to connect to `http://localhost:5000/api` by default.

To change the API URL, create a `.env` file in the `Frontend` directory:
```
VITE_API_URL=http://your-backend-url/api
```

