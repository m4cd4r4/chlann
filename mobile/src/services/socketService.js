import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WEBSOCKET_URL, CONSTANTS } from '../config/constants';

let socket = null;

const SocketService = {
  /**
   * Initialize socket connection
   * @returns {Promise<Object>} Socket instance
   */
  init: async () => {
    try {
      // Get auth token
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Initialize socket connection with auth token
      socket = io(WEBSOCKET_URL, {
        auth: {
          token
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        transports: ['websocket']
      });
      
      return socket;
    } catch (error) {
      console.error('Socket initialization error:', error);
      throw error;
    }
  },
  
  /**
   * Get socket instance
   * @returns {Object} Socket instance
   */
  getSocket: () => {
    if (!socket) {
      throw new Error('Socket not initialized. Call init() first');
    }
    return socket;
  },
  
  /**
   * Join a conversation room
   * @param {string} conversationId - Conversation ID
   */
  joinConversation: (conversationId) => {
    if (!socket) {
      throw new Error('Socket not initialized. Call init() first');
    }
    socket.emit(CONSTANTS.SOCKET_EVENTS.CONVERSATION_JOIN, conversationId);
  },
  
  /**
   * Leave a conversation room
   * @param {string} conversationId - Conversation ID
   */
  leaveConversation: (conversationId) => {
    if (!socket) {
      throw new Error('Socket not initialized. Call init() first');
    }
    socket.emit(CONSTANTS.SOCKET_EVENTS.CONVERSATION_LEAVE, conversationId);
  },
  
  /**
   * Send typing indicator
   * @param {string} conversationId - Conversation ID
   */
  sendTypingStart: (conversationId) => {
    if (!socket) {
      throw new Error('Socket not initialized. Call init() first');
    }
    socket.emit(CONSTANTS.SOCKET_EVENTS.TYPING_START, conversationId);
  },
  
  /**
   * Send stopped typing indicator
   * @param {string} conversationId - Conversation ID
   */
  sendTypingStop: (conversationId) => {
    if (!socket) {
      throw new Error('Socket not initialized. Call init() first');
    }
    socket.emit(CONSTANTS.SOCKET_EVENTS.TYPING_STOP, conversationId);
  },
  
  /**
   * Set online status
   * @param {boolean} isOnline - Whether user is online
   */
  setOnlineStatus: (isOnline) => {
    if (!socket) {
      throw new Error('Socket not initialized. Call init() first');
    }
    
    if (isOnline) {
      socket.emit(CONSTANTS.SOCKET_EVENTS.PRESENCE_ONLINE);
    } else {
      socket.emit(CONSTANTS.SOCKET_EVENTS.PRESENCE_OFFLINE);
    }
  },
  
  /**
   * Disconnect socket
   */
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },
  
  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on: (event, callback) => {
    if (!socket) {
      throw new Error('Socket not initialized. Call init() first');
    }
    socket.on(event, callback);
  },
  
  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  off: (event, callback) => {
    if (!socket) {
      return;
    }
    socket.off(event, callback);
  },
  
  /**
   * Handle automatic reconnection when token is refreshed
   * @param {string} newToken - New access token
   */
  updateToken: async (newToken) => {
    if (socket) {
      // Disconnect and reinitialize with new token
      socket.disconnect();
      
      // Store new token
      await AsyncStorage.setItem('accessToken', newToken);
      
      // Reinitialize
      return SocketService.init();
    }
  }
};

export default SocketService;
