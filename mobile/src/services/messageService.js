import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, ROUTES } from '../config/constants';

// Create an axios instance for API requests
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add the auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const MessageService = {
  /**
   * Get messages for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} limit - Maximum number of messages to return
   * @param {string} before - Message ID to get messages before (for pagination)
   * @returns {Promise<Object>} List of messages and pagination info
   */
  getMessages: async (conversationId, limit = 30, before = null) => {
    let url = `${ROUTES.MESSAGES}/${conversationId}?limit=${limit}`;
    if (before) {
      url += `&before=${before}`;
    }
    
    const response = await apiClient.get(url);
    return response.data;
  },
  
  /**
   * Send a message
   * @param {string} conversationId - Conversation ID
   * @param {string} content - Message content
   * @param {string} type - Message type (text, image, video, link)
   * @param {Array} media - Array of media objects
   * @param {string} replyTo - ID of message being replied to
   * @returns {Promise<Object>} The sent message
   */
  sendMessage: async (conversationId, content, type = 'text', media = [], replyTo = null) => {
    const payload = {
      content,
      type,
      media,
    };
    
    if (replyTo) {
      payload.replyTo = replyTo;
    }
    
    const response = await apiClient.post(`${ROUTES.MESSAGES}/${conversationId}`, payload);
    return response.data;
  },
  
  /**
   * Delete a message
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Success message
   */
  deleteMessage: async (messageId) => {
    const response = await apiClient.delete(`${ROUTES.MESSAGES}/${messageId}`);
    return response.data;
  },
  
  /**
   * Edit a message
   * @param {string} messageId - Message ID
   * @param {string} content - New message content
   * @returns {Promise<Object>} Updated message
   */
  editMessage: async (messageId, content) => {
    const response = await apiClient.put(`${ROUTES.MESSAGES}/${messageId}`, { content });
    return response.data;
  },
  
  /**
   * React to a message
   * @param {string} messageId - Message ID
   * @param {string} reaction - Reaction emoji
   * @returns {Promise<Object>} Updated reactions
   */
  reactToMessage: async (messageId, reaction) => {
    const response = await apiClient.post(`${ROUTES.MESSAGES}/${messageId}/reactions`, { reaction });
    return response.data;
  },
  
  /**
   * Upload media attachments for a message
   * @param {string} conversationId - Conversation ID
   * @param {Array} files - Array of file objects
   * @returns {Promise<Array>} Array of uploaded media details
   */
  uploadAttachments: async (conversationId, files) => {
    const uploads = files.map(async (file) => {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('conversationId', conversationId);
      
      const response = await apiClient.post(ROUTES.MEDIA_UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data.media;
    });
    
    return Promise.all(uploads);
  }
};

export default MessageService;
