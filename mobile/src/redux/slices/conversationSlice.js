import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ConversationService from '../../services/conversationService';

// Async thunks
export const fetchConversations = createAsyncThunk(
  'conversations/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ConversationService.getConversations();
      return response.conversations;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch conversations');
    }
  }
);

export const fetchConversationById = createAsyncThunk(
  'conversations/fetchById',
  async (conversationId, { rejectWithValue }) => {
    try {
      const response = await ConversationService.getConversationById(conversationId);
      return response.conversation;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch conversation');
    }
  }
);

export const createDirectConversation = createAsyncThunk(
  'conversations/createDirect',
  async (participantId, { rejectWithValue }) => {
    try {
      const response = await ConversationService.createDirectConversation(participantId);
      return response.conversation;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create conversation');
    }
  }
);

export const createGroupConversation = createAsyncThunk(
  'conversations/createGroup',
  async ({ name, participantIds }, { rejectWithValue }) => {
    try {
      const response = await ConversationService.createGroupConversation(name, participantIds);
      return response.conversation;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create group conversation');
    }
  }
);

export const updateGroupConversation = createAsyncThunk(
  'conversations/updateGroup',
  async ({ conversationId, name }, { rejectWithValue }) => {
    try {
      const response = await ConversationService.updateGroupConversation(conversationId, name);
      return response.conversation;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update group conversation');
    }
  }
);

export const addParticipants = createAsyncThunk(
  'conversations/addParticipants',
  async ({ conversationId, participantIds }, { rejectWithValue }) => {
    try {
      const response = await ConversationService.addParticipants(conversationId, participantIds);
      return response.conversation;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add participants');
    }
  }
);

export const removeParticipant = createAsyncThunk(
  'conversations/removeParticipant',
  async ({ conversationId, participantId }, { rejectWithValue }) => {
    try {
      const response = await ConversationService.removeParticipant(conversationId, participantId);
      return {
        conversation: response.conversation,
        deleted: response.deleted,
        participantId
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove participant');
    }
  }
);

export const markConversationAsRead = createAsyncThunk(
  'conversations/markAsRead',
  async (conversationId, { rejectWithValue }) => {
    try {
      await ConversationService.markAsRead(conversationId);
      return { conversationId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark conversation as read');
    }
  }
);

// Initial state
const initialState = {
  conversations: [],
  currentConversation: null,
  isLoading: false,
  error: null
};

// Slice
const conversationSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentConversation: (state, action) => {
      state.currentConversation = action.payload;
    },
    clearCurrentConversation: (state) => {
      state.currentConversation = null;
    },
    updateLastMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      const conversation = state.conversations.find(c => c._id === conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        // Sort conversations to bring the most recent to top
        state.conversations.sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        });
      }
    },
    updateUnreadCount: (state, action) => {
      const { conversationId, count } = action.payload;
      const conversation = state.conversations.find(c => c._id === conversationId);
      if (conversation) {
        conversation.unreadCount = count;
      }
    },
    receivedNewConversation: (state, action) => {
      const newConversation = action.payload;
      const index = state.conversations.findIndex(c => c._id === newConversation._id);
      if (index === -1) {
        state.conversations.unshift(newConversation);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Conversations
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Conversation by ID
      .addCase(fetchConversationById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversationById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentConversation = action.payload;
        
        // Update the conversation in the list if it exists
        const index = state.conversations.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.conversations[index] = action.payload;
        } else {
          state.conversations.unshift(action.payload);
        }
      })
      .addCase(fetchConversationById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Create Direct Conversation
      .addCase(createDirectConversation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createDirectConversation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentConversation = action.payload;
        
        // Add to conversations list if it doesn't exist
        const index = state.conversations.findIndex(c => c._id === action.payload._id);
        if (index === -1) {
          state.conversations.unshift(action.payload);
        }
      })
      .addCase(createDirectConversation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Create Group Conversation
      .addCase(createGroupConversation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createGroupConversation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentConversation = action.payload;
        state.conversations.unshift(action.payload);
      })
      .addCase(createGroupConversation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Group Conversation
      .addCase(updateGroupConversation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateGroupConversation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentConversation = action.payload;
        
        // Update in conversations list
        const index = state.conversations.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.conversations[index] = action.payload;
        }
      })
      .addCase(updateGroupConversation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Add Participants
      .addCase(addParticipants.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addParticipants.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentConversation = action.payload;
        
        // Update in conversations list
        const index = state.conversations.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.conversations[index] = action.payload;
        }
      })
      .addCase(addParticipants.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Remove Participant
      .addCase(removeParticipant.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeParticipant.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (action.payload.deleted) {
          // Remove from conversations list if deleted
          state.conversations = state.conversations.filter(
            c => c._id !== action.payload.conversation._id
          );
          
          // Clear current conversation if it's the one deleted
          if (state.currentConversation && 
              state.currentConversation._id === action.payload.conversation._id) {
            state.currentConversation = null;
          }
        } else {
          // Update conversation
          state.currentConversation = action.payload.conversation;
          
          // Update in conversations list
          const index = state.conversations.findIndex(c => c._id === action.payload.conversation._id);
          if (index !== -1) {
            state.conversations[index] = action.payload.conversation;
          }
        }
      })
      .addCase(removeParticipant.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Mark as Read
      .addCase(markConversationAsRead.fulfilled, (state, action) => {
        const { conversationId } = action.payload;
        const conversation = state.conversations.find(c => c._id === conversationId);
        if (conversation) {
          conversation.unreadCount = 0;
        }
        
        if (state.currentConversation && state.currentConversation._id === conversationId) {
          state.currentConversation.unreadCount = 0;
        }
      });
  },
});

export const { 
  clearError, 
  setCurrentConversation, 
  clearCurrentConversation,
  updateLastMessage,
  updateUnreadCount,
  receivedNewConversation
} = conversationSlice.actions;

export default conversationSlice.reducer;
