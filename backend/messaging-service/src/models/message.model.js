const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'link', 'system'],
    default: 'text'
  },
  media: [{
    url: String,
    type: String,
    thumbnailUrl: String,
    fileName: String,
    fileSize: Number,
    width: Number,
    height: Number,
    duration: Number, // for videos
    peopleTagged: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sending'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ 'media.peopleTagged': 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
