require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createClient } = require('redis');
const logger = require('./utils/logger');
const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  });

// Connect to Redis
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD
});

redisClient.on('error', (err) => logger.error(`Redis connection error: ${err}`));
redisClient.connect().then(() => logger.info('Connected to Redis'));

// Make Redis client available throughout the app
app.set('redisClient', redisClient);

// Routes
app.use('/', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  logger.info(`Auth Service running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  await redisClient.quit();
  logger.info('App terminated, connections closed');
  process.exit(0);
});

module.exports = app; // For testing
