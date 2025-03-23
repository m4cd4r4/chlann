// API URLs
export const API_URL = 'http://localhost:8000';
export const WEBSOCKET_URL = 'ws://localhost:8080';

// API routes
export const ROUTES = {
  // Auth routes
  AUTH: '/api/auth',
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  REFRESH_TOKEN: '/api/auth/refresh-token',
  PROFILE: '/api/auth/profile',
  
  // Conversation routes
  CONVERSATIONS: '/api/messages/conversations',
  MESSAGES: '/api/messages',
  
  // Media routes
  MEDIA: '/api/media',
  MEDIA_UPLOAD: '/api/media/upload',
  PRESIGNED_URL: '/api/media/presigned-url',
  
  // Search routes
  SEARCH: '/api/search'
};

// App constants
export const CONSTANTS = {
  // Media
  MAX_IMAGE_SIZE: 20 * 1024 * 1024, // 20MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  
  // Messages
  MESSAGE_PAGE_SIZE: 30,
  
  // UI
  TYPING_TIMEOUT: 3000, // 3 seconds
  
  // Timeouts and intervals
  TOKEN_REFRESH_INTERVAL: 15 * 60 * 1000, // 15 minutes
  ONLINE_STATUS_INTERVAL: 60 * 1000, // 1 minute
  
  // Socket events
  SOCKET_EVENTS: {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    MESSAGE_NEW: 'message:new',
    MESSAGE_EDIT: 'message:edit',
    MESSAGE_DELETE: 'message:delete',
    MESSAGE_REACTION: 'message:reaction',
    CONVERSATION_NEW: 'conversation:new',
    CONVERSATION_UPDATE: 'conversation:update',
    CONVERSATION_READ: 'conversation:read',
    CONVERSATION_DELETE: 'conversation:delete',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
    PRESENCE_UPDATE: 'presence:update',
    PRESENCE_ONLINE: 'presence:online',
    PRESENCE_OFFLINE: 'presence:offline',
    CONVERSATION_JOIN: 'conversation:join',
    CONVERSATION_LEAVE: 'conversation:leave'
  }
};

// Theme colors
export const COLORS = {
  PRIMARY: '#1e88e5',
  SECONDARY: '#26a69a',
  SUCCESS: '#66bb6a',
  ERROR: '#ef5350',
  WARNING: '#ffca28',
  INFO: '#29b6f6',
  LIGHT: '#f5f5f5',
  DARK: '#212121',
  WHITE: '#ffffff',
  BLACK: '#000000',
  BACKGROUND: '#ffffff',
  CARD: '#ffffff',
  TEXT: '#212121',
  BORDER: '#e0e0e0',
  NOTIFICATION: '#ff4081',
  MUTED: '#9e9e9e',
  
  // Message bubbles
  SENT_BUBBLE: '#e3f2fd',
  RECEIVED_BUBBLE: '#f5f5f5',
  SENT_TEXT: '#212121',
  RECEIVED_TEXT: '#212121',
  
  // Theme (dark/light mode)
  DARK_THEME: {
    BACKGROUND: '#121212',
    CARD: '#1e1e1e',
    TEXT: '#ffffff',
    BORDER: '#333333',
    SENT_BUBBLE: '#0d47a1',
    RECEIVED_BUBBLE: '#333333',
    SENT_TEXT: '#ffffff',
    RECEIVED_TEXT: '#ffffff',
  }
};

// Animation durations
export const ANIMATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500
};
