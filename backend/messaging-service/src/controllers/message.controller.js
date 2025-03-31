const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');
const logger = require('../utils/logger');
const axios = require('axios'); // For triggering search indexing

// Helper function to trigger search indexing for a message
const triggerSearchIndex = async (messageDoc) => {
  // Avoid indexing deleted or system messages directly
  if (messageDoc.type === 'system' || messageDoc.metadata?.deleted) {
    return;
  }
  try {
    const searchServiceUrl = process.env.SEARCH_SERVICE_URL || 'http://search-service:3004';
    await axios.post(`${searchServiceUrl}/index`, {
      contentId: messageDoc._id,
      contentType: 'message',
      userId: messageDoc.sender, // Index under the sender's ID
      content: messageDoc.content, // Text content
      metadata: {
        type: messageDoc.type,
        mediaCount: messageDoc.media?.length || 0,
        edited: messageDoc.edited || false,
      },
      conversationId: messageDoc.conversation,
      createdAt: messageDoc.createdAt
    });
    logger.info(`Triggered search indexing for message: ${messageDoc._id}`);
  } catch (error) {
    logger.error(`Failed to trigger search indexing for message ${messageDoc._id}: ${error.message}`);
    // Handle error appropriately
  }
};

// Helper function to trigger search index deletion for a message
const triggerSearchDelete = async (messageId, userId) => {
   try {
    const searchServiceUrl = process.env.SEARCH_SERVICE_URL || 'http://search-service:3004';
    // Note: The search index delete endpoint expects contentType and contentId in params
    // Adjust if the search service API expects userId for deletion authorization
    await axios.delete(`${searchServiceUrl}/delete/message/${messageId}`);
    logger.info(`Triggered search index deletion for message: ${messageId}`);
  } catch (error) {
    logger.error(`Failed to trigger search index deletion for message ${messageId}: ${error.message}`);
  }
};


/**
 * Get messages for a conversation
 */
exports.getMessages = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { conversationId } = req.params;
  const { limit = 50, before } = req.query;

  try {
    // Check if user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or you are not a participant' });
    }

    // Build query
    const query = { conversation: conversationId };
    
    // Add filter for pagination
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      query._id = { $lt: before };
    }

    // Get messages
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'username profilePicture')
      .populate('readBy.user', 'username profilePicture')
      .populate('replyTo')
      .populate('media') // Populate the media field
      .lean();

    // Get unread count for this user
    const unreadCount = conversation.unreadCount.get(userId.toString()) || 0;

    res.status(200).json({
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === parseInt(limit),
      unreadCount
    });
  } catch (error) {
    logger.error(`Get messages error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Send a new message
 */
exports.sendMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { conversationId } = req.params;
  const { content, type = 'text', media = [], replyTo, metadata = {} } = req.body;

  // Validate message content
  if ((type === 'text' || type === 'link') && (!content || content.trim() === '')) {
    return res.status(400).json({ error: 'Message content is required for text and link messages' });
  }

  if ((type === 'image' || type === 'video') && (!media || media.length === 0)) {
    return res.status(400).json({ error: 'Media is required for image and video messages' });
  }

  // Validate replyTo message ID if provided
  if (replyTo && !mongoose.Types.ObjectId.isValid(replyTo)) {
    return res.status(400).json({ error: 'Invalid reply message ID' });
  }

  try {
    // Check if user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or you are not a participant' });
    }

    // Create new message
    const newMessage = new Message({
      conversation: conversationId,
      sender: userId,
      content,
      type,
      media,
      replyTo,
      metadata,
      status: 'sent',
      readBy: [{ user: userId, readAt: new Date() }]
    });

    await newMessage.save();

    // Update last message in conversation
    conversation.lastMessage = newMessage._id;
    
    // Increment unread count for all participants except sender
    const unreadCount = new Map(conversation.unreadCount);
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== userId) {
        const currentCount = unreadCount.get(participantId.toString()) || 0;
        unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });
    conversation.unreadCount = unreadCount;
    
    await conversation.save();

    // Populate details for the response and WebSocket event
    await newMessage.populate([
      { path: 'sender', select: 'username profilePicture' },
      { path: 'media' } // Populate media details
    ]);

    // Populate reply message if exists
    if (replyTo) {
      await newMessage.populate({ // This might need adjustment if populate doesn't chain well
        path: 'replyTo', // Consider populating replyTo within the array above if possible
        populate: {
          path: 'sender',
          select: 'username profilePicture'
        }
      });
    }

    // Publish event via Redis for WebSocket
    const redisClient = req.app.get('redisClient');
    await redisClient.publish('message:new', JSON.stringify({
      message: newMessage,
      conversationId,
      participants: conversation.participants
    }));

    res.status(201).json({
      message: 'Message sent successfully',
      data: newMessage
    });

    // Trigger search indexing asynchronously
    triggerSearchIndex(newMessage).catch(err => logger.error(`Async search index trigger failed: ${err.message}`));

  } catch (error) {
    logger.error(`Send message error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Delete a message
 */
exports.deleteMessage = async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;

  try {
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the sender of the message
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Soft delete by updating message content
    message.content = 'This message has been deleted';
    message.media = [];
    message.type = 'text';
    message.metadata = { deleted: true };
    message.edited = true;
    message.editedAt = new Date();
    
    await message.save();

    // Check if this was the last message in the conversation
    const conversation = await Conversation.findById(message.conversation);
    if (conversation && conversation.lastMessage && conversation.lastMessage.toString() === messageId) {
      // Find the new last message
      const newLastMessage = await Message.findOne({ 
        conversation: message.conversation,
        _id: { $ne: messageId }
      }).sort({ createdAt: -1 });

      if (newLastMessage) {
        conversation.lastMessage = newLastMessage._id;
      } else {
        conversation.lastMessage = null;
      }
      
      await conversation.save();
    }

    // Publish event via Redis for WebSocket
    const redisClient = req.app.get('redisClient');
    await redisClient.publish('message:delete', JSON.stringify({
      messageId,
      conversationId: message.conversation,
      message
    }));

    res.status(200).json({
      message: 'Message deleted successfully'
    });

    // Trigger search index deletion asynchronously
    triggerSearchDelete(messageId, userId).catch(err => logger.error(`Async search delete trigger failed: ${err.message}`));

  } catch (error) {
    logger.error(`Delete message error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Edit a message
 */
exports.editMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the sender of the message
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    // Check if message type is text
    if (message.type !== 'text') {
      return res.status(400).json({ error: 'Only text messages can be edited' });
    }

    // Update message
    message.content = content;
    message.edited = true;
    message.editedAt = new Date();
    
    await message.save();

    // Populate sender details
    await message.populate('sender', 'username profilePicture');

    // Publish event via Redis for WebSocket
    const redisClient = req.app.get('redisClient');
    await redisClient.publish('message:edit', JSON.stringify({
      message,
      conversationId: message.conversation
    }));

    res.status(200).json({
      message: 'Message edited successfully',
      data: message
    });

    // Trigger search re-indexing asynchronously
    triggerSearchIndex(message).catch(err => logger.error(`Async search index trigger failed after edit: ${err.message}`));

  } catch (error) {
    logger.error(`Edit message error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * React to a message
 */
exports.reactToMessage = async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;
  const { reaction } = req.body;

  if (!reaction) {
    return res.status(400).json({ error: 'Reaction is required' });
  }

  try {
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if the message has a reactions array in metadata
    if (!message.metadata || !message.metadata.reactions) {
      message.metadata = { ...message.metadata, reactions: [] };
    }

    // Check if user already reacted
    const userReactionIndex = message.metadata.reactions.findIndex(r => 
      r.userId && r.userId.toString() === userId
    );

    if (userReactionIndex !== -1) {
      // Update existing reaction
      message.metadata.reactions[userReactionIndex].reaction = reaction;
    } else {
      // Add new reaction
      message.metadata.reactions.push({ userId, reaction });
    }

    await message.save();

    // Publish event via Redis for WebSocket
    const redisClient = req.app.get('redisClient');
    await redisClient.publish('message:reaction', JSON.stringify({
      messageId,
      userId,
      reaction,
      conversationId: message.conversation
    }));

    res.status(200).json({
      message: 'Reaction added successfully',
      reactions: message.metadata.reactions
    });
  } catch (error) {
    logger.error(`React to message error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};
