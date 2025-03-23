import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import MediaService from '../../services/mediaService';

// Async thunks
export const uploadMedia = createAsyncThunk(
  'media/upload',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await MediaService.uploadMedia(formData);
      return response.media;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload media');
    }
  }
);

export const getPresignedUrl = createAsyncThunk(
  'media/getPresignedUrl',
  async ({ fileName, fileType, fileSize }, { rejectWithValue }) => {
    try {
      const response = await MediaService.getPresignedUrl(fileName, fileType, fileSize);
      return {
        uploadUrl: response.uploadUrl,
        key: response.key,
        mediaId: response.mediaId
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get presigned URL');
    }
  }
);

export const confirmUpload = createAsyncThunk(
  'media/confirmUpload',
  async ({ mediaId, conversationId, messageId, peopleTagged }, { rejectWithValue }) => {
    try {
      const response = await MediaService.confirmUpload(mediaId, conversationId, messageId, peopleTagged);
      return response.media;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to confirm upload');
    }
  }
);

export const fetchMediaList = createAsyncThunk(
  'media/fetchList',
  async ({ page = 1, limit = 20, mediaType, conversationId, startDate, endDate, peopleTagged }, { rejectWithValue }) => {
    try {
      const response = await MediaService.getMediaList(page, limit, mediaType, conversationId, startDate, endDate, peopleTagged);
      return {
        media: response.media,
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch media');
    }
  }
);

export const fetchMediaById = createAsyncThunk(
  'media/fetchById',
  async (mediaId, { rejectWithValue }) => {
    try {
      const response = await MediaService.getMediaById(mediaId);
      return response.media;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch media');
    }
  }
);

export const updateMedia = createAsyncThunk(
  'media/update',
  async ({ mediaId, peopleTagged, isPublic, metadata }, { rejectWithValue }) => {
    try {
      const response = await MediaService.updateMedia(mediaId, peopleTagged, isPublic, metadata);
      return response.media;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update media');
    }
  }
);

export const deleteMedia = createAsyncThunk(
  'media/delete',
  async (mediaId, { rejectWithValue }) => {
    try {
      await MediaService.deleteMedia(mediaId);
      return { mediaId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete media');
    }
  }
);

export const searchMedia = createAsyncThunk(
  'media/search',
  async ({ query, mediaType, startDate, endDate, peopleTagged, page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const response = await MediaService.searchMedia(query, mediaType, startDate, endDate, peopleTagged, page, limit);
      return {
        results: response.results,
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search media');
    }
  }
);

// Initial state
const initialState = {
  mediaList: [],
  currentMedia: null,
  mediaById: {}, // Cache for media items by ID
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  },
  searchResults: [],
  searchPagination: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  },
  isLoading: false,
  uploading: false,
  uploadProgress: 0,
  error: null,
  uploadError: null,
  presignedUrl: null,
  pendingUploads: []
};

// Slice
const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.uploadError = null;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    clearCurrentMedia: (state) => {
      state.currentMedia = null;
    },
    addPendingUpload: (state, action) => {
      state.pendingUploads.push(action.payload);
    },
    removePendingUpload: (state, action) => {
      const uploadId = action.payload;
      state.pendingUploads = state.pendingUploads.filter(upload => upload.id !== uploadId);
    },
    updatePendingUpload: (state, action) => {
      const { id, progress, status, error } = action.payload;
      const upload = state.pendingUploads.find(u => u.id === id);
      if (upload) {
        upload.progress = progress || upload.progress;
        upload.status = status || upload.status;
        upload.error = error || upload.error;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Upload Media
      .addCase(uploadMedia.pending, (state) => {
        state.uploading = true;
        state.uploadError = null;
        state.uploadProgress = 0;
      })
      .addCase(uploadMedia.fulfilled, (state, action) => {
        state.uploading = false;
        state.uploadProgress = 100;
        state.currentMedia = action.payload;
        
        // Add to media list if it's not already there
        const exists = state.mediaList.some(media => media._id === action.payload._id);
        if (!exists) {
          state.mediaList.unshift(action.payload);
        }
        
        // Add to mediaById cache
        state.mediaById[action.payload._id] = action.payload;
      })
      .addCase(uploadMedia.rejected, (state, action) => {
        state.uploading = false;
        state.uploadError = action.payload;
      })
      
      // Get Presigned URL
      .addCase(getPresignedUrl.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPresignedUrl.fulfilled, (state, action) => {
        state.isLoading = false;
        state.presignedUrl = action.payload;
      })
      .addCase(getPresignedUrl.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Confirm Upload
      .addCase(confirmUpload.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(confirmUpload.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentMedia = action.payload;
        
        // Add to media list
        const exists = state.mediaList.some(media => media._id === action.payload._id);
        if (!exists) {
          state.mediaList.unshift(action.payload);
        } else {
          // Update existing item
          state.mediaList = state.mediaList.map(media => 
            media._id === action.payload._id ? action.payload : media
          );
        }
        
        // Update in mediaById cache
        state.mediaById[action.payload._id] = action.payload;
      })
      .addCase(confirmUpload.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Media List
      .addCase(fetchMediaList.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMediaList.fulfilled, (state, action) => {
        state.isLoading = false;
        const { media, pagination } = action.payload;
        
        if (pagination.page === 1) {
          // Replace list for first page
          state.mediaList = media;
        } else {
          // Append for pagination
          const existingIds = new Set(state.mediaList.map(item => item._id));
          const newItems = media.filter(item => !existingIds.has(item._id));
          state.mediaList = [...state.mediaList, ...newItems];
        }
        
        // Update pagination
        state.pagination = pagination;
        
        // Add all items to mediaById cache
        media.forEach(item => {
          state.mediaById[item._id] = item;
        });
      })
      .addCase(fetchMediaList.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Media By ID
      .addCase(fetchMediaById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMediaById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentMedia = action.payload;
        state.mediaById[action.payload._id] = action.payload;
      })
      .addCase(fetchMediaById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Media
      .addCase(updateMedia.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateMedia.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Update in current media if it's the same one
        if (state.currentMedia && state.currentMedia._id === action.payload._id) {
          state.currentMedia = action.payload;
        }
        
        // Update in mediaList
        state.mediaList = state.mediaList.map(media => 
          media._id === action.payload._id ? action.payload : media
        );
        
        // Update in mediaById cache
        state.mediaById[action.payload._id] = action.payload;
      })
      .addCase(updateMedia.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Delete Media
      .addCase(deleteMedia.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteMedia.fulfilled, (state, action) => {
        state.isLoading = false;
        const { mediaId } = action.payload;
        
        // Remove from currentMedia if it's the same one
        if (state.currentMedia && state.currentMedia._id === mediaId) {
          state.currentMedia = null;
        }
        
        // Remove from mediaList
        state.mediaList = state.mediaList.filter(media => media._id !== mediaId);
        
        // Remove from mediaById cache
        delete state.mediaById[mediaId];
      })
      .addCase(deleteMedia.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Search Media
      .addCase(searchMedia.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchMedia.fulfilled, (state, action) => {
        state.isLoading = false;
        const { results, pagination } = action.payload;
        
        if (pagination.page === 1) {
          // Replace results for first page
          state.searchResults = results;
        } else {
          // Append for pagination
          const existingIds = new Set(state.searchResults.map(item => item._id));
          const newItems = results.filter(item => !existingIds.has(item._id));
          state.searchResults = [...state.searchResults, ...newItems];
        }
        
        // Update search pagination
        state.searchPagination = pagination;
        
        // Add all items to mediaById cache
        results.forEach(item => {
          state.mediaById[item._id] = item;
        });
      })
      .addCase(searchMedia.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  clearError, 
  setUploadProgress, 
  clearCurrentMedia,
  addPendingUpload,
  removePendingUpload,
  updatePendingUpload
} = mediaSlice.actions;

export default mediaSlice.reducer;
