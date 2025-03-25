const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware to verify JWT token
 * For development purposes, this is a simplified version
 */
const verifyToken = (req, res, next) => {
  // For development mode, bypass authentication
  if (process.env.NODE_ENV === 'development') {
    // Add a mock user for development
    req.user = {
      id: 'mock-user-id',
      username: 'devuser',
      email: 'dev@example.com'
    };
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

  if (!token) {
    logger.warn('Authentication failed: No token provided');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.error(`Token verification failed: ${err.message}`);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = {
  verifyToken
};
