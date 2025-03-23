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

const ConversationService = {
  /**
   * Get all conversations for the current user
   * @returns {Promise<Object>} List of conversations
   */
  getConversations: async () => {
    const response = await apiClient.get(ROUTES.CONVERSATIONS);
    return response.data;
  },
  
  /**
   * Get a single conversation by ID
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} Conversation details
   */
  getConversationById: async (conversationId) => {
    const response = await apiClient.get(`${ROUTES.CONVERSATIONS}/${conversationId}`);
    return response.data;
  },
  
  /**
   * Create a new direct conversation
   * @param {string} participantId - Participant user ID
   * @returns {Promise<Object>} New conversation
   */
  createDirectConversation: async (participantId) => {
    const response = await apiClient.post(`${ROUTES.CONVERSATIONS}/direct`, {
      participantId
    });
    return response.data;
  },
  
  /**
   * Create a new group conversation
   * @param {string} name - Group name
   * @param {Array<string>} participantIds - Array of participant user IDs
   * @returns {Promise<Object>} New group conversation
   */
  createGroupConversation: async (name, participantIds) => {
    const response = await apiClient.post(`${ROUTES.CONVERSATIONS}/group`, {
      name,
      participantIds
    });
    return response.data;
  },
  
  /**
   * Update a group conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} name - New group name
   * @returns {Promise<Object>} Updated conversation
   */
  updateGroupConversation: async (conversationId, name) => {
    const response = await apiClient.put(`${ROUTES.CONVERSATIONS}/${conversationId}`, {
      name
    });
    return response.data;
  },
  
  /**
   * Add participants to a group conversation
   * @param {string} conversationId - Conversation ID
   * @param {Array<string>} participantIds - Array of participant user IDs to add
   * @returns {Promise<Object>} Updated conversation
   */
  addParticipants: async (conversationId, participantIds) => {
    const response = await apiClient.post(`${ROUTES.CONVERSATIONS}/${conversationId}/participants`, {
      participantIds
    });
    return response.data;
  },
  
  /**
   * Remove a participant from a group conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} participantId - Participant user ID to remove
   * @returns {Promise<Object>} Updated conversation or deletion confirmation
   */
  removeParticipant: async (conversationId, participantId) => {
    const response = await apiClient.delete(
      `${ROUTES.CONVERSATIONS}/${conversationId}/participants/${participantId}`
    );
    return response.data;
  },
  
  /**
   * Mark a conversation as read
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} Success message
   */
  markAsRead: async (conversationId) => {
    const response = await apiClient.post(`${ROUTES.CONVERSATIONS}/${conversationId}/read`);
    return response.data;
  }
};

export default ConversationService;
