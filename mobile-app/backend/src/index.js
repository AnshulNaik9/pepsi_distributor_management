require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

// Global Mongoose Config to ensure IDs are strings
mongoose.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    if (ret._id) ret.id = ret._id.toString();
    // Recursively handle nested ObjectIds if any
    for (let key in ret) {
      if (ret[key] instanceof mongoose.Types.ObjectId) {
        ret[key] = ret[key].toString();
      }
    }
    return ret;
  }
});

const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const truckRoutes = require('./routes/trucks');
const routeRoutes = require('./routes/routes');
const customerRoutes = require('./routes/customers');
const offerRoutes = require('./routes/offers');
const orderRoutes = require('./routes/orders');
const expenseRoutes = require('./routes/expenses');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5050;

// Ultimate Universal CORS Middleware - Must be absolute first
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const requestHeaders = req.headers['access-control-request-headers'];
  
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', requestHeaders || 'X-Requested-With, Content-Type, Authorization, Accept, Origin, Access-Control-Allow-Headers');
  res.setHeader('Access-Control-Expose-Headers', '*');
  res.setHeader('Vary', 'Origin');
  
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());
const corsOptions = {
  origin: '*', // Allow all for development flexibility
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(morgan('dev'));

// No-cache headers for API
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/godown-stock', inventoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root check
app.get('/', (req, res) => {
  res.json({ message: 'DistriSys API is running', version: '1.0.0' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Internal Server Error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Auto-seed if empty
    const { Product } = require('./models');
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('🌱 Database is empty, running seed...');
      await require('./seed')();
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 DistriSys API server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
