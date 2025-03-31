const mongoose = require('mongoose');

const mediaVersionSchema = new mongoose.Schema({
  key: { type: String, required: true }, // S3 Key
  url: { type: String, required: true }, // Public or Presigned URL
  width: { type: Number },
  height: { type: Number },
  size: { type: Number }, // File size in bytes
  type: { type: String } // e.g., 'original', 'thumbnail', 'small', 'medium', 'large', 'processed_video'
}, { _id: false });

const thumbnailSchema = new mongoose.Schema({
  key: { type: String, required: true },
  url: { type: String, required: true },
  position: { type: Number } // For video thumbnails
}, { _id: false });

const mediaSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming 'User' model exists in auth-service context (or needs population)
    required: true,
    index: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation', // Assuming 'Conversation' model exists in messaging-service context
    index: true
  },
  messageId: { // Link to the message containing this media
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message', // Assuming 'Message' model exists in messaging-service context
    index: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String
  },
  // Store different processed versions
  versions: {
    original: mediaVersionSchema,
    thumbnail: mediaVersionSchema, // For images
    small: mediaVersionSchema,     // For images
    medium: mediaVersionSchema,    // For images
    large: mediaVersionSchema,     // For images
    processed_video: mediaVersionSchema // For videos
  },
  // Store video thumbnails separately
  videoThumbnails: [thumbnailSchema],
  primaryThumbnailUrl: { // Convenience field for the main thumbnail (image or video)
    type: String
  },
  // Original dimensions/duration
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  duration: { // In seconds, for video
    type: Number
  },
  // Metadata for search/filtering (can be expanded)
  caption: {
    type: String,
    default: ''
  },
  peopleTagged: [{
    type: mongoose.Schema.Types.ObjectId // Refers to User IDs
  }],
  // Status tracking
  uploadStatus: {
    type: String,
    enum: ['pending', 'uploading', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: {
    type: String
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Index for efficient querying by type and user
mediaSchema.index({ userId: 1, mediaType: 1 });
mediaSchema.index({ createdAt: -1 });

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;
