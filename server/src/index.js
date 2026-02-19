require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const companiesRoutes = require('./routes/companies');
const appsRoutes = require('./routes/apps');
const sessionsRoutes = require('./routes/sessions');
const screenshotsRoutes = require('./routes/screenshots');
const issuesRoutes = require('./routes/issues');
const insightsRoutes = require('./routes/insights');
const automationRoutes = require('./routes/automation');
const testRoutes = require('./routes/test');
const webTestRoutes = require('./routes/web-test');
const devicesRoutes = require('./routes/devices');
const { pool, testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Allow all origins for mobile access
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/apps', appsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/screenshots', screenshotsRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/test', testRoutes);
app.use('/api/tests', webTestRoutes);
app.use('/api/devices', devicesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server
async function start() {
  try {
    await testConnection();
    console.log('Database connection established');
    
    app.listen(PORT, () => {
      console.log(`AppLens API Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
