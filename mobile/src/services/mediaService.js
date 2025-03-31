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

// Base URL for media service assumed to be mapped by API Gateway
const MEDIA_API_BASE = `${API_URL}${ROUTES.MEDIA}`; // e.g., http://localhost:8000/api/media

const MediaService = {
  /**
   * Get presigned URL for direct upload to S3
   * @param {string} filename - Original file name
   * @param {string} mimeType - MIME type
   * @param {string} conversationId - Optional conversation ID to associate
   * @param {string} messageId - Optional message ID to associate
   * @returns {Promise<Object>} Presigned URL details { presignedUrl, key, mediaId }
   */
  getPresignedUploadUrl: async (filename, mimeType, conversationId = null, messageId = null) => {
    // Assuming ROUTES.PRESIGNED_URL points to the correct endpoint like '/presigned-upload-url' relative to MEDIA_API_BASE
    const response = await apiClient.post(`${MEDIA_API_BASE}/presigned-upload-url`, {
      filename,
      mimeType,
      conversationId,
      messageId
    });
    return response.data;
  },

  /**
   * Confirm upload completion and trigger processing
   * @param {string} mediaId - Media ID obtained from getPresignedUploadUrl
   * @returns {Promise<Object>} Confirmation status { message, mediaId, status }
   */
  confirmUpload: async (mediaId) => {
    const payload = { mediaId };
    const response = await apiClient.post(`${MEDIA_API_BASE}/confirm-upload`, payload);
    return response.data;
  },
  
  /**
   * Get a list of media
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {string} mediaType - Filter by media type (image, video)
   * @param {string} conversationId - Filter by conversation
   * @param {string} startDate - Filter by start date
   * @param {string} endDate - Filter by end date
   * @param {Array} peopleTagged - Filter by tagged people
   * @returns {Promise<Object>} List of media and pagination info
   */
  getMediaList: async (
    page = 1, 
    limit = 20,
    conversationId = null,
    mediaType = null
  ) => {
    const params = {
      page,
      limit,
      conversationId,
      mediaType
    };
    // Remove null/undefined params
    Object.keys(params).forEach(key => params[key] == null && delete params[key]);

    const response = await apiClient.get(MEDIA_API_BASE, { params });
    return response.data;
  },
  
  /**
   * Get a single media item by ID
   * @param {string} mediaId - Media ID
   * @returns {Promise<Object>} Media details
   */
  getMediaById: async (mediaId) => {
    const response = await apiClient.get(`${MEDIA_API_BASE}/${mediaId}`);
    return response.data;
  },
  
  /**
   * Update media metadata (caption, peopleTagged)
   * @param {string} mediaId - Media ID
   * @param {Object} updates - Object containing updates { caption?, peopleTagged? }
   * @returns {Promise<Object>} Updated media object
   */
  updateMedia: async (mediaId, updates) => {
    const payload = {};
    if (updates.caption !== undefined) payload.caption = updates.caption;
    if (updates.peopleTagged !== undefined) payload.peopleTagged = updates.peopleTagged;

    const response = await apiClient.put(`${MEDIA_API_BASE}/${mediaId}`, payload);
    return response.data;
  },
  
  /**
   * Delete media
   * @param {string} mediaId - Media ID
   * @returns {Promise<Object>} Success message
   */
  deleteMedia: async (mediaId) => {
    const response = await apiClient.delete(`${MEDIA_API_BASE}/${mediaId}`);
    return response.data;
  },

  /**
   * Upload file to S3 directly using presigned URL
   * @param {string} presignedUrl - Presigned URL for upload
   * @param {Blob} file - File to upload
   * @param {string} contentType - Content type
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result
   */
  uploadToS3: async (presignedUrl, file, contentType, onProgress = null) => {
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.open('PUT', presignedUrl, true);
      xhr.setRequestHeader('Content-Type', contentType);
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            success: true,
            url: presignedUrl.split('?')[0] // URL without query params
          });
        } else {
          reject({
            success: false,
            status: xhr.status,
            message: xhr.statusText
          });
        }
      };
      
      xhr.onerror = () => {
        reject({
          success: false,
          message: 'Network error occurred during upload'
        });
      };
      
      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }
      
      xhr.send(file);
    });
  },
  
  /**
   * Get media by people tagged
   * @param {string} personId - Person ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Media list and pagination info
   */
  getMediaByPerson: async (personId, page = 1, limit = 20) => {
    const url = `${ROUTES.MEDIA}/people/${personId}?page=${page}&limit=${limit}`;
    const response = await apiClient.get(url);
    return response.data;
  },
  
  /**
   * Get media by date range
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Media list and pagination info
   */
  getMediaByDateRange: async (startDate, endDate, page = 1, limit = 20) => {
    let url = `${ROUTES.MEDIA}/date-range?page=${page}&limit=${limit}`;
    
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    const response = await apiClient.get(url);
    return response.data;
  }
  // Removed searchMedia, getMediaByPerson, getMediaByDateRange, getMediaStats
  // These should be handled by searchService.js
};

export default MediaService;
