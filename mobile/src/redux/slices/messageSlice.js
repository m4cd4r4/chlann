import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import MessageService from '../../services/messageService';

// Async thunks
export const fetchMessages = createAsyncThunk(
  'messages/fetchAll',
  async ({ conversationId, limit = 50, before = null }, { rejectWithValue }) => {
    try {
      const response = await MessageService.getMessages(conversationId, limit, before);
      return {
        messages: response.messages,
        hasMore: response.hasMore,
        conversationId,
        unreadCount: response.unreadCount
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'messages/send',
  async ({ conversationId, content, type = 'text', media = [], replyTo = null }, { rejectWithValue }) => {
    try {
      const response = await MessageService.sendMessage(
        conversationId, 
        content, 
        type, 
        media, 
        replyTo
      );
      return {
        message: response.data,
        conversationId
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const deleteMessage = createAsyncThunk(
  'messages/delete',
  async ({ messageId, conversationId }, { rejectWithValue }) => {
    try {
      await MessageService.deleteMessage(messageId);
      return { messageId, conversationId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete message');
    }
  }
);

export const editMessage = createAsyncThunk(
  'messages/edit',
  async ({ messageId, content, conversationId }, { rejectWithValue }) => {
    try {
      const response = await MessageService.editMessage(messageId, content);
      return {
        message: response.data,
        conversationId
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to edit message');
    }
  }
);

export const reactToMessage = createAsyncThunk(
  'messages/react',
  async ({ messageId, reaction, conversationId }, { rejectWithValue }) => {
    try {
      const response = await MessageService.reactToMessage(messageId, reaction);
      return {
        messageId,
        reactions: response.reactions,
        conversationId
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to react to message');
    }
  }
);

// Initial state
const initialState = {
  messages: {},  // Grouped by conversationId
  hasMore: {},   // Tracks if there are more messages to load for each conversation
  isLoading: false,
  error: null,
  sending: false,
  lastSentMessage: null,
  pendingMessages: [] // For optimistic updates
};

// Slice
const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessages: (state, action) => {
      const conversationId = action.payload;
      if (conversationId) {
        // Clear messages for a specific conversation
        delete state.messages[conversationId];
        delete state.hasMore[conversationId];
      } else {
        // Clear all messages
        state.messages = {};
        state.hasMore = {};
      }
    },
    addPendingMessage: (state, action) => {
      const pendingMessage = action.payload;
      state.pendingMessages.push(pendingMessage);
      
      // Also add to the messages array for the conversation
      const conversationId = pendingMessage.conversation;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(pendingMessage);
    },
    removePendingMessage: (state, action) => {
      const { tempId, conversationId } = action.payload;
      
      // Remove from pending messages
      state.pendingMessages = state.pendingMessages.filter(msg => msg._id !== tempId);
      
      // Remove from conversation messages if it exists
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].filter(
          msg => msg._id !== tempId
        );
      }
    },
    messageReceived: (state, action) => {
      const { message, conversationId } = action.payload;
      
      // Add to messages if the conversation exists
      if (state.messages[conversationId]) {
        // Check if message already exists to avoid duplicates
        const exists = state.messages[conversationId].some(msg => msg._id === message._id);
        if (!exists) {
          state.messages[conversationId].push(message);
          
          // Sort messages by created date
          state.messages[conversationId].sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
          );
        }
      }
    },
    messageUpdated: (state, action) => {
      const { message, conversationId } = action.payload;
      
      // Update message if the conversation exists
      if (state.messages[conversationId]) {
        const index = state.messages[conversationId].findIndex(msg => msg._id === message._id);
        if (index !== -1) {
          state.messages[conversationId][index] = message;
        }
      }
    },
    messageDeleted: (state, action) => {
      const { messageId, conversationId } = action.payload;
      
      // Remove message if the conversation exists
      if (state.messages[conversationId]) {
        const index = state.messages[conversationId].findIndex(msg => msg._id === messageId);
        if (index !== -1) {
          // Replace with a deleted message indicator instead of removing
          state.messages[conversationId][index] = {
            ...state.messages[conversationId][index],
            content: 'This message has been deleted',
            deleted: true,
            media: []
          };
        }
      }
    },
    reactionAdded: (state, action) => {
      const { messageId, reaction, userId, conversationId } = action.payload;
      
      // Add reaction if the conversation and message exist
      if (state.messages[conversationId]) {
        const message = state.messages[conversationId].find(msg => msg._id === messageId);
        if (message) {
          if (!message.metadata) message.metadata = {};
          if (!message.metadata.reactions) message.metadata.reactions = [];
          
          // Check if user already reacted
          const existingReaction = message.metadata.reactions.findIndex(r => r.userId === userId);
          if (existingReaction !== -1) {
            // Update existing reaction
            message.metadata.reactions[existingReaction].reaction = reaction;
          } else {
            // Add new reaction
            message.metadata.reactions.push({ userId, reaction });
          }
        }
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Messages
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { messages, hasMore, conversationId, unreadCount } = action.payload;
        state.isLoading = false;
        
        // Initialize conversation messages array if it doesn't exist
        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
        
        // Append messages (for pagination)
        const existingIds = new Set(state.messages[conversationId].map(msg => msg._id));
        const newMessages = messages.filter(msg => !existingIds.has(msg._id));
        state.messages[conversationId] = [
          ...state.messages[conversationId],
          ...newMessages
        ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        // Update hasMore flag
        state.hasMore[conversationId] = hasMore;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Send Message
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { message, conversationId } = action.payload;
        state.sending = false;
        state.lastSentMessage = message;
        
        // Initialize conversation messages array if it doesn't exist
        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
        
        // Add message to array
        const exists = state.messages[conversationId].some(msg => msg._id === message._id);
        if (!exists) {
          state.messages[conversationId].push(message);
          
          // Sort messages by created date
          state.messages[conversationId].sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
          );
        }
        
        // Remove corresponding pending message if exists
        state.pendingMessages = state.pendingMessages.filter(
          msg => msg.tempId !== message.tempId
        );
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload;
      })
      
      // Delete Message
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const { messageId, conversationId } = action.payload;
        
        // Find and mark message as deleted
        if (state.messages[conversationId]) {
          const index = state.messages[conversationId].findIndex(msg => msg._id === messageId);
          if (index !== -1) {
            state.messages[conversationId][index] = {
              ...state.messages[conversationId][index],
              content: 'This message has been deleted',
              deleted: true,
              media: []
            };
          }
        }
      })
      
      // Edit Message
      .addCase(editMessage.fulfilled, (state, action) => {
        const { message, conversationId } = action.payload;
        
        // Find and update message
        if (state.messages[conversationId]) {
          const index = state.messages[conversationId].findIndex(msg => msg._id === message._id);
          if (index !== -1) {
            state.messages[conversationId][index] = message;
          }
        }
      })
      
      // React to Message
      .addCase(reactToMessage.fulfilled, (state, action) => {
        const { messageId, reactions, conversationId } = action.payload;
        
        // Find and update message reactions
        if (state.messages[conversationId]) {
          const message = state.messages[conversationId].find(msg => msg._id === messageId);
          if (message) {
            if (!message.metadata) message.metadata = {};
            message.metadata.reactions = reactions;
          }
        }
      });
  },
});

export const { 
  clearError, 
  clearMessages, 
  addPendingMessage, 
  removePendingMessage,
  messageReceived,
  messageUpdated,
  messageDeleted,
  reactionAdded
} = messageSlice.actions;

export default messageSlice.reducer;
