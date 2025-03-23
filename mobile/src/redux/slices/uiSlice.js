import { createSlice } from '@reduxjs/toolkit';

// Initial state
const initialState = {
  theme: 'light',
  language: 'en',
  notifications: {
    enabled: true,
    sound: true,
    vibration: true
  },
  mediaPreferences: {
    autoDownload: true,
    highQualityMedia: true,
    saveToGallery: false
  },
  typingUsers: {}, // { conversationId: [userId1, userId2, ...] }
  onlineUsers: {}, // { userId: true/false }
  selectedMedia: null,
  modalVisible: {
    createConversation: false,
    mediaViewer: false,
    profileEditor: false,
    groupSettings: false
  },
  toastMessage: null
};

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    updateNotificationSettings: (state, action) => {
      state.notifications = {
        ...state.notifications,
        ...action.payload
      };
    },
    updateMediaPreferences: (state, action) => {
      state.mediaPreferences = {
        ...state.mediaPreferences,
        ...action.payload
      };
    },
    userStartedTyping: (state, action) => {
      const { userId, conversationId } = action.payload;
      
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      
      if (!state.typingUsers[conversationId].includes(userId)) {
        state.typingUsers[conversationId].push(userId);
      }
    },
    userStoppedTyping: (state, action) => {
      const { userId, conversationId } = action.payload;
      
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          id => id !== userId
        );
      }
    },
    setUserOnlineStatus: (state, action) => {
      const { userId, status } = action.payload;
      state.onlineUsers[userId] = status;
    },
    setSelectedMedia: (state, action) => {
      state.selectedMedia = action.payload;
    },
    clearSelectedMedia: (state) => {
      state.selectedMedia = null;
    },
    setModalVisibility: (state, action) => {
      const { modal, visible } = action.payload;
      state.modalVisible[modal] = visible;
    },
    showToast: (state, action) => {
      state.toastMessage = action.payload;
    },
    clearToast: (state) => {
      state.toastMessage = null;
    }
  }
});

export const { 
  setTheme,
  setLanguage,
  updateNotificationSettings,
  updateMediaPreferences,
  userStartedTyping,
  userStoppedTyping,
  setUserOnlineStatus,
  setSelectedMedia,
  clearSelectedMedia,
  setModalVisibility,
  showToast,
  clearToast
} = uiSlice.actions;

export default uiSlice.reducer;
