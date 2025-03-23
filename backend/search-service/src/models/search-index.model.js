const mongoose = require('mongoose');

const searchIndexSchema = new mongoose.Schema({
  // Content ID can refer to message ID, conversation ID, user ID, or media ID
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  // Content type can be 'message', 'conversation', 'user', 'media'
  contentType: {
    type: String,
    enum: ['message', 'conversation', 'user', 'media'],
    required: true
  },
  // User ID that has access to this content
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  // Text content for searching
  content: {
    type: String,
    required: true
  },
  // Additional metadata for filtering
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // For messages or media, the conversation it belongs to
  conversationId: {
    type: mongoose.Schema.Types.ObjectId
  },
  // For media, people tagged in it
  peopleTagged: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  // Creation date for sorting
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Last update date
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create text index for full-text search
searchIndexSchema.index(
  { content: 'text' },
  { 
    weights: { content: 10 },
    name: 'content_text_index'
  }
);

// Create compound index for filtering by content type and user
searchIndexSchema.index({ contentType: 1, userId: 1 });

// Create index for filtering by conversation
searchIndexSchema.index({ conversationId: 1 });

// Create index for filtering by people tagged
searchIndexSchema.index({ peopleTagged: 1 });

// Create index for sorting by date
searchIndexSchema.index({ createdAt: -1 });

const SearchIndex = mongoose.model('SearchIndex', searchIndexSchema);

module.exports = SearchIndex;
