// App-wide constants and configuration

// API and WebSocket URLs
export const API_URL = 'http://localhost:8000'; // From API_GATEWAY_URL in .env
export const WEBSOCKET_URL = 'ws://localhost:8080'; // From WEBSOCKET_URL in .env

// API Routes
export const ROUTES = {
  // Auth routes
  AUTH: '/api/auth',
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  REFRESH_TOKEN: '/api/auth/refresh-token',
  PROFILE: '/api/auth/profile',
  
  // Conversation routes
  CONVERSATIONS: '/api/conversations',
  
  // Message routes
  MESSAGES: '/api/messages',
  
  // Media routes
  MEDIA: '/api/media',
  MEDIA_UPLOAD: '/api/media/upload',
  PRESIGNED_URL: '/api/media/presigned-url',
  
  // Search routes
  SEARCH: '/api/search'
};

// Socket events
export const SOCKET_EVENTS = {
  CONVERSATION_JOIN: 'conversation:join',
  CONVERSATION_LEAVE: 'conversation:leave',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_READ: 'message:read'
};

// Color scheme
export const COLORS = {
  // Primary colors
  PRIMARY: '#2B68E6', // Blue
  SECONDARY: '#34C759', // Green
  
  // UI colors
  BACKGROUND: '#FFFFFF', // White
  SURFACE: '#F7F7F7', // Light Gray
  LIGHT: '#F7F7F7', // Light Gray (same as surface)
  DARK_SURFACE: '#2C2C2E', // Dark Gray
  
  // Text colors
  TEXT: '#121212', // Near Black
  TEXT_SECONDARY: '#646464', // Medium Gray
  MUTED: '#A0A0A0', // Light Medium Gray
  WHITE: '#FFFFFF', // White
  
  // Border and divider colors
  BORDER: '#E5E5E5', // Light Gray
  
  // Message bubble colors
  SENT_BUBBLE: '#DCF8C6', // Light Green
  RECEIVED_BUBBLE: '#FFFFFF', // White
  SENT_TEXT: '#000000', // Black
  RECEIVED_TEXT: '#000000', // Black
  
  // Status colors
  SUCCESS: '#34C759', // Green
  WARNING: '#FF9500', // Orange
  DANGER: '#FF3B30', // Red
  INFO: '#007AFF', // Blue
};

// App constants
export const CONSTANTS = {
  // Timing
  TYPING_TIMEOUT: 2000, // ms
  
  // Limits
  MAX_MESSAGE_LENGTH: 2000, // characters
  IMAGE_QUALITY: 0.9, // 0-1
  
  // Screen dimensions
  SCREEN_PADDING: 16, // pixels
};
