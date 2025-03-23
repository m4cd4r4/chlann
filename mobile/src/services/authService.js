import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/constants';

const API_AUTH_URL = `${API_URL}/api/auth`;

// Axios instance for auth requests
const authAxios = axios.create({
  baseURL: API_AUTH_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add the auth token to requests
authAxios.interceptors.request.use(
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

// Response interceptor to handle token refresh on 401 errors
authAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't already tried to refresh the token
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          // No refresh token, force logout
          await AsyncStorage.removeItem('accessToken');
          return Promise.reject(error);
        }
        
        // Attempt to refresh the token
        const response = await axios.post(`${API_AUTH_URL}/refresh-token`, {
          refreshToken
        });
        
        const { accessToken } = response.data;
        
        // Store the new access token
        await AsyncStorage.setItem('accessToken', accessToken);
        
        // Update the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        // Retry the original request
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, force logout
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

const AuthService = {
  /**
   * Register a new user
   * @param {string} username - Username
   * @param {string} email - Email address
   * @param {string} password - Password
   * @returns {Promise<Object>} User and tokens
   */
  register: async (username, email, password) => {
    const response = await authAxios.post('/register', {
      username,
      email,
      password
    });
    return response.data;
  },
  
  /**
   * Login user
   * @param {string} email - Email address
   * @param {string} password - Password
   * @returns {Promise<Object>} User and tokens
   */
  login: async (email, password) => {
    const response = await authAxios.post('/login', {
      email,
      password
    });
    return response.data;
  },
  
  /**
   * Logout user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Success message
   */
  logout: async (userId) => {
    const response = await authAxios.post('/logout', { userId });
    return response.data;
  },
  
  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New access token
   */
  refreshToken: async (refreshToken) => {
    const response = await axios.post(`${API_AUTH_URL}/refresh-token`, {
      refreshToken
    });
    return response.data;
  },
  
  /**
   * Get user profile
   * @returns {Promise<Object>} User profile
   */
  getProfile: async () => {
    const response = await authAxios.get('/profile');
    return response.data.user;
  },
  
  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated user profile
   */
  updateProfile: async (profileData) => {
    const response = await authAxios.put('/profile', profileData);
    return response.data;
  },
  
  /**
   * Change password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success message
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await authAxios.put('/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }
};

export default AuthService;
