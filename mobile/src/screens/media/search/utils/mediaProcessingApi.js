import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URLs - would come from environment config in a real app
const API_URLS = {
  MEDIA_SERVICE: 'http://localhost:3001/api',
  SEARCH_SERVICE: 'http://localhost:3002/api'
};

/**
 * Media Processing API Utility
 * 
 * Handles interactions with the media and search services for:
 * - Searching media with various filters
 * - Processing media uploads with quality variants
 * - Managing media metadata
 */
class MediaProcessingApi {
  constructor() {
    // Initialize axios instance with interceptors for auth
    this.api = axios.create();
    
    // Add auth token to requests
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }
  
  /**
   * Searches for media based on query and filters
   * Integrates with search-service and media-service for comprehensive results
   */
  async searchMedia(params) {
    const {
      query = '',
      mediaTypes = [],
      dateRange = { start: null, end: null },
      quality = null,
      page = 1,
      limit = 20,
    } = params;
    
    try {
      // Prepare search parameters
      const searchParams = new URLSearchParams();
      if (query) searchParams.append('query', query);
      if (mediaTypes.length > 0) searchParams.append('contentTypes', mediaTypes.join(','));
      if (dateRange.start) searchParams.append('startDate', dateRange.start);
      if (dateRange.end) searchParams.append('endDate', dateRange.end);
      searchParams.append('page', page);
      searchParams.append('limit', limit);
      
      // Execute search against the search service
      const response = await this.api.get(
        `${API_URLS.SEARCH_SERVICE}/search?${searchParams.toString()}`
      );
      
      // Process and enhance results with quality information
      const results = response.data.results.map(item => {
        // For media items, we'll add quality info
        if (item.contentType === 'media') {
          return {
            ...item,
            // Add quality property - in real app would come from metadata
            quality: this._determineQuality(item),
            // Add URLs for different quality variants
            urls: this._generateQualityUrls(item)
          };
        }
        return item;
      });
      
      // Filter by quality if specified
      const filteredResults = quality 
        ? this._filterByQuality(results, quality)
        : results;
      
      return {
        results: filteredResults,
        pagination: response.data.pagination,
        hasMore: response.data.pagination.page < response.data.pagination.pages
      };
    } catch (error) {
      console.error('Media search error:', error);
      throw new Error('Failed to search media');
    }
  }
  
  /**
   * Gets a single media item with all quality variants
   */
  async getMediaById(mediaId) {
    try {
      const response = await this.api.get(
        `${API_URLS.MEDIA_SERVICE}/media/${mediaId}`
      );
      
      // Add quality URLs and metadata
      return {
        ...response.data,
        quality: this._determineQuality(response.data),
        urls: this._generateQualityUrls(response.data)
      };
    } catch (error) {
      console.error('Media fetch error:', error);
      throw new Error('Failed to get media');
    }
  }
  
  /**
   * Starts processing for the media with quality variants
   */
  async processMedia(mediaId, options = {}) {
    try {
      const { prioritizeQuality = false } = options;
      
      await this.api.post(
        `${API_URLS.MEDIA_SERVICE}/media/${mediaId}/process`,
        { prioritizeQuality }
      );
      
      return { success: true, message: 'Media processing started' };
    } catch (error) {
      console.error('Media processing error:', error);
      throw new Error('Failed to process media');
    }
  }
  
  /**
   * Gets the processing status for a media item
   */
  async getProcessingStatus(mediaId) {
    try {
      const response = await this.api.get(
        `${API_URLS.MEDIA_SERVICE}/media/${mediaId}/status`
      );
      
      return {
        ...response.data,
        qualityProgress: response.data.variants.map(v => ({
          quality: v.quality,
          progress: v.progress,
          completed: v.completed,
          url: v.url
        }))
      };
    } catch (error) {
      console.error('Media status error:', error);
      throw new Error('Failed to get processing status');
    }
  }
  
  /**
   * Indexes media content for search
   */
  async indexMedia(mediaId, metadata = {}) {
    try {
      // Extract searchable metadata
      const {
        caption,
        tags = [],
        location,
        people = [],
        ...otherMetadata
      } = metadata;
      
      // Prepare indexing payload
      const indexPayload = {
        contentId: mediaId,
        contentType: 'media',
        content: caption || '',
        metadata: {
          tags,
          location,
          people,
          ...otherMetadata
        }
      };
      
      // Submit for indexing
      await this.api.post(
        `${API_URLS.SEARCH_SERVICE}/index`,
        indexPayload
      );
      
      return { success: true, message: 'Media indexed successfully' };
    } catch (error) {
      console.error('Media indexing error:', error);
      throw new Error('Failed to index media');
    }
  }
  
  /**
   * Determines quality level based on media properties
   * In a real app this would use actual media metadata
   * @private
   */
  _determineQuality(media) {
    // This is a simplified mock implementation
    // In a real app, would use actual resolution and format data
    
    if (!media) return 'SD';
    
    // In this mock implementation, we'll randomly assign quality levels
    // In a real app, this would be based on actual metadata
    const qualityMap = {
      0: 'SD',
      1: 'HD',
      2: '4K',
      3: 'RAW'
    };
    
    // Simulate assigning quality based on media ID
    const idNumber = parseInt((media.id || '').replace(/\D/g, '') || '0');
    return qualityMap[idNumber % 4] || 'SD';
  }
  
  /**
   * Generates URLs for different quality variants
   * @private
   */
  _generateQualityUrls(media) {
    if (!media || !media.id) return {};
    
    // In a real app, these would be actual variant URLs from the media service
    return {
      thumbnail: `${API_URLS.MEDIA_SERVICE}/media/${media.id}/thumbnail`,
      preview: `${API_URLS.MEDIA_SERVICE}/media/${media.id}/preview`, 
      high: `${API_URLS.MEDIA_SERVICE}/media/${media.id}/high`,
      original: `${API_URLS.MEDIA_SERVICE}/media/${media.id}/original`
    };
  }
  
  /**
   * Filters results by minimum quality level
   * @private
   */
  _filterByQuality(results, minQuality) {
    if (!minQuality) return results;
    
    const qualityLevels = { 'SD': 0, 'HD': 1, '4K': 2, 'RAW': 3 };
    const minQualityLevel = qualityLevels[minQuality] || 0;
    
    return results.filter(item => {
      const itemQuality = item.quality || 'SD';
      const itemQualityLevel = qualityLevels[itemQuality] || 0;
      return itemQualityLevel >= minQualityLevel;
    });
  }
}

// Create and export singleton instance
const mediaProcessingApi = new MediaProcessingApi();
export default mediaProcessingApi;
