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

const MediaService = {
  /**
   * Upload media file
   * @param {FormData} formData - Form data with media file and metadata
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<Object>} Uploaded media details
   */
  uploadMedia: async (formData, onProgress = null) => {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };
    
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      };
    }
    
    const response = await apiClient.post(ROUTES.MEDIA_UPLOAD, formData, config);
    return response.data;
  },
  
  /**
   * Get presigned URL for direct upload to S3
   * @param {string} fileName - Original file name
   * @param {string} fileType - MIME type
   * @param {number} fileSize - File size in bytes
   * @returns {Promise<Object>} Presigned URL details
   */
  getPresignedUrl: async (fileName, fileType, fileSize) => {
    const response = await apiClient.post(ROUTES.PRESIGNED_URL, {
      fileName,
      fileType,
      fileSize
    });
    return response.data;
  },
  
  /**
   * Confirm upload completion
   * @param {string} mediaId - Media ID
   * @param {string} conversationId - Optional conversation ID
   * @param {string} messageId - Optional message ID
   * @param {Array} peopleTagged - Optional array of user IDs tagged in the media
   * @returns {Promise<Object>} Processed media details
   */
  confirmUpload: async (mediaId, conversationId = null, messageId = null, peopleTagged = []) => {
    const payload = { mediaId };
    
    if (conversationId) payload.conversationId = conversationId;
    if (messageId) payload.messageId = messageId;
    if (peopleTagged && peopleTagged.length > 0) payload.peopleTagged = peopleTagged;
    
    const response = await apiClient.post(`${ROUTES.MEDIA}/confirm-upload`, payload);
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
    mediaType = null, 
    conversationId = null, 
    startDate = null, 
    endDate = null, 
    peopleTagged = null
  ) => {
    let url = `${ROUTES.MEDIA}?page=${page}&limit=${limit}`;
    
    if (mediaType) url += `&mediaType=${mediaType}`;
    if (conversationId) url += `&conversationId=${conversationId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (peopleTagged) url += `&peopleTagged=${peopleTagged.join(',')}`;
    
    const response = await apiClient.get(url);
    return response.data;
  },
  
  /**
   * Get a single media item by ID
   * @param {string} mediaId - Media ID
   * @returns {Promise<Object>} Media details
   */
  getMediaById: async (mediaId) => {
    const response = await apiClient.get(`${ROUTES.MEDIA}/${mediaId}`);
    return response.data;
  },
  
  /**
   * Update media metadata
   * @param {string} mediaId - Media ID
   * @param {Array} peopleTagged - People tagged in the media
   * @param {boolean} isPublic - Whether the media is public
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Updated media
   */
  updateMedia: async (mediaId, peopleTagged = null, isPublic = null, metadata = null) => {
    const payload = {};
    
    if (peopleTagged !== null) payload.peopleTagged = peopleTagged;
    if (isPublic !== null) payload.isPublic = isPublic;
    if (metadata !== null) payload.metadata = metadata;
    
    const response = await apiClient.put(`${ROUTES.MEDIA}/${mediaId}`, payload);
    return response.data;
  },
  
  /**
   * Delete media
   * @param {string} mediaId - Media ID
   * @returns {Promise<Object>} Success message
   */
  deleteMedia: async (mediaId) => {
    const response = await apiClient.delete(`${ROUTES.MEDIA}/${mediaId}`);
    return response.data;
  },
  
  /**
   * Search media by various criteria
   * @param {string} query - Search query
   * @param {string} mediaType - Filter by media type
   * @param {string} startDate - Filter by start date
   * @param {string} endDate - Filter by end date
   * @param {Array} peopleTagged - Filter by tagged people
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Search results and pagination info
   */
  searchMedia: async (
    query = '', 
    mediaType = null, 
    startDate = null, 
    endDate = null, 
    peopleTagged = null,
    page = 1,
    limit = 20
  ) => {
    let url = `${ROUTES.MEDIA}/search?page=${page}&limit=${limit}`;
    
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (mediaType) url += `&mediaType=${mediaType}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (peopleTagged) url += `&peopleTagged=${peopleTagged.join(',')}`;
    
    const response = await apiClient.get(url);
    return response.data;
  },
  
  /**
   * Upload media to S3 directly using presigned URL
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
  },
  
  /**
   * Get media statistics
   * @returns {Promise<Object>} Media statistics
   */
  getMediaStats: async () => {
    const response = await apiClient.get(`${ROUTES.MEDIA}/stats`);
    return response.data;
  }
};

export default MediaService;
