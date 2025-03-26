const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  isGroupChat: {
    type: Boolean,
    default: false
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});

// Virtual for message count
conversationSchema.virtual('messageCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversation',
  count: true
});

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ createdAt: -1 });
conversationSchema.index({ updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
