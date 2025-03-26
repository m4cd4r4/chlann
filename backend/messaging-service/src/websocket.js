require('dotenv').config();
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const logger = require('./utils/logger');

// Create HTTP server
const server = http.createServer();
const PORT = process.env.WEBSOCKET_PORT || 8080;

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Connect to Redis
const connectToRedis = async () => {
  try {
    const pubClient = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      password: process.env.REDIS_PASSWORD
    });
    
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    
    io.adapter(createAdapter(pubClient, subClient));
    
    logger.info('Connected to Redis for WebSocket adapter');
    
    // Subscribe to Redis channels for messaging events
    const subscriber = pubClient.duplicate();
    await subscriber.connect();
    
    // Channel for new messages
    await subscriber.subscribe('message:new', (message) => {
      try {
        const data = JSON.parse(message);
        // Emit to all users in the conversation
        data.participants.forEach(userId => {
          io.to(`user:${userId}`).emit('message:new', {
            message: data.message,
            conversationId: data.conversationId
          });
        });
      } catch (error) {
        logger.error(`Error processing message:new event: ${error.message}`);
      }
    });

    // Channel for message edits
    await subscriber.subscribe('message:edit', (message) => {
      try {
        const data = JSON.parse(message);
        io.to(`conversation:${data.conversationId}`).emit('message:edit', {
          message: data.message
        });
      } catch (error) {
        logger.error(`Error processing message:edit event: ${error.message}`);
      }
    });

    // Channel for message deletions
    await subscriber.subscribe('message:delete', (message) => {
      try {
        const data = JSON.parse(message);
        io.to(`conversation:${data.conversationId}`).emit('message:delete', {
          messageId: data.messageId,
          message: data.message
        });
      } catch (error) {
        logger.error(`Error processing message:delete event: ${error.message}`);
      }
    });

    // Channel for message reactions
    await subscriber.subscribe('message:reaction', (message) => {
      try {
        const data = JSON.parse(message);
        io.to(`conversation:${data.conversationId}`).emit('message:reaction', {
          messageId: data.messageId,
          userId: data.userId,
          reaction: data.reaction
        });
      } catch (error) {
        logger.error(`Error processing message:reaction event: ${error.message}`);
      }
    });

    // Channel for new conversations
    await subscriber.subscribe('conversation:new', (message) => {
      try {
        const data = JSON.parse(message);
        io.to(`user:${data.userId}`).emit('conversation:new', {
          conversation: data.conversation
        });
        io.to(`user:${data.participantId}`).emit('conversation:new', {
          conversation: data.conversation
        });
      } catch (error) {
        logger.error(`Error processing conversation:new event: ${error.message}`);
      }
    });

    // Channel for new group conversations
    await subscriber.subscribe('conversation:new:group', (message) => {
      try {
        const data = JSON.parse(message);
        data.participants.forEach(userId => {
          io.to(`user:${userId}`).emit('conversation:new', {
            conversation: data.conversation,
            message: data.message
          });
        });
      } catch (error) {
        logger.error(`Error processing conversation:new:group event: ${error.message}`);
      }
    });

    // Channel for conversation updates
    await subscriber.subscribe('conversation:update', (message) => {
      try {
        const data = JSON.parse(message);
        io.to(`conversation:${data.conversation._id}`).emit('conversation:update', {
          conversation: data.conversation,
          message: data.message
        });
      } catch (error) {
        logger.error(`Error processing conversation:update event: ${error.message}`);
      }
    });

    // Channel for participant additions
    await subscriber.subscribe('conversation:participants:add', (message) => {
      try {
        const data = JSON.parse(message);
        // Notify existing participants
        io.to(`conversation:${data.conversation._id}`).emit('conversation:update', {
          conversation: data.conversation,
          message: data.message
        });
        
        // Notify new participants
        data.newParticipants.forEach(userId => {
          io.to(`user:${userId}`).emit('conversation:new', {
            conversation: data.conversation,
            message: data.message
          });
        });
      } catch (error) {
        logger.error(`Error processing conversation:participants:add event: ${error.message}`);
      }
    });

    // Channel for participant removals
    await subscriber.subscribe('conversation:participants:remove', (message) => {
      try {
        const data = JSON.parse(message);
        // Notify remaining participants
        io.to(`conversation:${data.conversation._id}`).emit('conversation:update', {
          conversation: data.conversation,
          message: data.message
        });
        
        // Notify removed participant
        io.to(`user:${data.removedParticipant}`).emit('conversation:leave', {
          conversationId: data.conversation._id,
          message: data.message
        });
      } catch (error) {
        logger.error(`Error processing conversation:participants:remove event: ${error.message}`);
      }
    });

    // Channel for conversation read status
    await subscriber.subscribe('conversation:read', (message) => {
      try {
        const data = JSON.parse(message);
        io.to(`conversation:${data.conversationId}`).emit('conversation:read', {
          conversationId: data.conversationId,
          userId: data.userId
        });
      } catch (error) {
        logger.error(`Error processing conversation:read event: ${error.message}`);
      }
    });

    // Channel for conversation deletions
    await subscriber.subscribe('conversation:delete', (message) => {
      try {
        const data = JSON.parse(message);
        io.to(`conversation:${data.conversationId}`).emit('conversation:delete', {
          conversationId: data.conversationId
        });
      } catch (error) {
        logger.error(`Error processing conversation:delete event: ${error.message}`);
      }
    });

    return {
      pubClient,
      subClient,
      subscriber
    };
  } catch (error) {
    logger.error(`Redis connection error: ${error.message}`);
    process.exit(1);
  }
};

// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    logger.error(`Socket authentication error: ${error.message}`);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Handle socket connections
io.on('connection', (socket) => {
  const userId = socket.user.id;
  logger.info(`User connected: ${userId}`);
  
  // Join personal room for the user
  socket.join(`user:${userId}`);
  
  // Handle joining conversations
  socket.on('conversation:join', (conversationId) => {
    if (!conversationId) return;
    
    socket.join(`conversation:${conversationId}`);
    logger.info(`User ${userId} joined conversation ${conversationId}`);
  });
  
  // Handle leaving conversations
  socket.on('conversation:leave', (conversationId) => {
    if (!conversationId) return;
    
    socket.leave(`conversation:${conversationId}`);
    logger.info(`User ${userId} left conversation ${conversationId}`);
  });
  
  // Handle user typing indicator
  socket.on('typing:start', (conversationId) => {
    if (!conversationId) return;
    
    socket.to(`conversation:${conversationId}`).emit('typing:start', {
      userId,
      conversationId
    });
  });
  
  socket.on('typing:stop', (conversationId) => {
    if (!conversationId) return;
    
    socket.to(`conversation:${conversationId}`).emit('typing:stop', {
      userId,
      conversationId
    });
  });
  
  // Handle user presence (online/offline)
  socket.on('presence:online', () => {
    io.emit('presence:update', {
      userId,
      status: 'online'
    });
  });
  
  socket.on('presence:offline', () => {
    io.emit('presence:update', {
      userId,
      status: 'offline'
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${userId}`);
    io.emit('presence:update', {
      userId,
      status: 'offline'
    });
  });
});

// Start the server
const startServer = async () => {
  const redisClients = await connectToRedis();
  
  server.listen(PORT, () => {
    logger.info(`WebSocket server running on port ${PORT}`);
  });
  
  // Handle graceful shutdown
  const shutdown = async () => {
    // Close server
    server.close(() => {
      logger.info('WebSocket server closed');
    });
    
    // Close Redis connections
    if (redisClients) {
      if (redisClients.pubClient) await redisClients.pubClient.quit();
      if (redisClients.subClient) await redisClients.subClient.quit();
      if (redisClients.subscriber) await redisClients.subscriber.quit();
      logger.info('Redis connections closed');
    }
    
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer().catch(error => {
  logger.error(`Server startup error: ${error.message}`);
  process.exit(1);
});
