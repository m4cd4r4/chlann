const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  bucket: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true
  },
  originalUrl: {
    type: String,
    required: true
  },
  processedUrls: {
    type: Map,
    of: String,
    default: {}
  },
  thumbnailUrl: {
    type: String
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  duration: {
    type: Number
  },
  peopleTagged: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'error'],
    default: 'uploading'
  },
  processingError: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
mediaSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaSchema.index({ mediaType: 1 });
mediaSchema.index({ conversationId: 1 });
mediaSchema.index({ messageId: 1 });
mediaSchema.index({ peopleTagged: 1 });

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;
