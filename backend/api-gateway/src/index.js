require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('./middleware/auth');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
// Explicitly configure CORS to allow the frontend origin
app.use(cors({
  origin: 'http://localhost:8081', // Allow requests from Expo Metro bundler
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow common methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers
  credentials: true // Allow cookies if needed (might not be necessary here)
}));
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth service proxy - no auth required for these routes
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/'
  },
  logLevel: 'error',
}));

// Middleware to verify JWT for protected routes
app.use('/api', verifyToken);

// Messaging service proxy
app.use('/api/messages', createProxyMiddleware({
  target: process.env.MESSAGING_SERVICE_URL || 'http://messaging-service:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/api/messages': '/'
  },
  logLevel: 'error',
}));

// Media service proxy
app.use('/api/media', createProxyMiddleware({
  target: process.env.MEDIA_SERVICE_URL || 'http://media-service:3003',
  changeOrigin: true,
  pathRewrite: {
    '^/api/media': '/'
  },
  logLevel: 'error',
}));

// Search service proxy
app.use('/api/search', createProxyMiddleware({
  target: process.env.SEARCH_SERVICE_URL || 'http://search-service:3004',
  changeOrigin: true,
  pathRewrite: {
    '^/api/search': '/'
  },
  logLevel: 'error',
}));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});

module.exports = app; // For testing
