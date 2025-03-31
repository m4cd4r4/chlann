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

const SearchService = {
  /**
   * Search content across messages, conversations, users, and media
   * @param {string} query - Search query
   * @param {Array} contentTypes - Types of content to search (messages, conversations, users, media)
   * @param {string} conversationId - Filter by conversation
   * @param {Array} peopleTagged - Filter by people tagged
   * @param {string} startDate - Filter by start date
   * @param {string} endDate - Filter by end date
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Search results and pagination info
   */
  search: async (
    query = '',
    contentTypes = null,
    conversationId = null,
    peopleTagged = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 20
  ) => {
    let url = `${ROUTES.SEARCH}?page=${page}&limit=${limit}`;
    
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (contentTypes) url += `&contentTypes=${contentTypes.join(',')}`;
    if (conversationId) url += `&conversationId=${conversationId}`;
    if (peopleTagged) url += `&peopleTagged=${peopleTagged.join(',')}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    const response = await apiClient.get(url);
    return response.data;
  },
  
  /**
   * Search by person
   * @param {string} personId - Person ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Array} contentTypes - Types of content to search
   * @returns {Promise<Object>} Search results and pagination info
   */
  searchByPerson: async (personId, page = 1, limit = 20, contentTypes = null) => {
    let url = `${ROUTES.SEARCH}/person/${personId}?page=${page}&limit=${limit}`;
    
    if (contentTypes) url += `&contentTypes=${contentTypes.join(',')}`;
    
    const response = await apiClient.get(url);
    return response.data;
  },
  
  /**
   * Search by date range
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Array} contentTypes - Types of content to search
   * @returns {Promise<Object>} Search results and pagination info
   */
  searchByDateRange: async (startDate, endDate, page = 1, limit = 20, contentTypes = null) => {
    let url = `${ROUTES.SEARCH}/date-range?page=${page}&limit=${limit}`;
    
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (contentTypes) url += `&contentTypes=${contentTypes.join(',')}`;
    
    const response = await apiClient.get(url);
    return response.data;
  },
  
  /**
   * Search in a specific conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Search results and pagination info
   */
  searchInConversation: async (conversationId, query = '', page = 1, limit = 20) => {
    let url = `${ROUTES.SEARCH}/conversation/${conversationId}?page=${page}&limit=${limit}`;
    
    if (query) url += `&query=${encodeURIComponent(query)}`;
    
    const response = await apiClient.get(url);
    return response.data;
  },
  
  /**
   * Find similar content
   * @param {string} contentType - Content type (message, conversation, user, media)
   * @param {string} contentId - Content ID
   * @returns {Promise<Object>} Similar content
   */
  findSimilarContent: async (contentType, contentId) => {
    const url = `${ROUTES.SEARCH}/similar/${contentType}/${contentId}`;
    const response = await apiClient.get(url);
    return response.data;
  }
  // Removed indexContent as indexing is handled by backend services
};

export default SearchService;
