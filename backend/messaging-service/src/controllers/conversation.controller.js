const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const logger = require('../utils/logger');

/**
 * Get all conversations for a user
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'username profilePicture')
      .populate('lastMessage')
      .populate('groupAdmin', 'username')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      conversations
    });
  } catch (error) {
    logger.error(`Get conversations error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get a single conversation by ID
 */
exports.getConversationById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    })
      .populate('participants', 'username profilePicture')
      .populate('lastMessage')
      .populate('groupAdmin', 'username');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.status(200).json({
      conversation
    });
  } catch (error) {
    logger.error(`Get conversation error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Create a new direct conversation between two users
 */
exports.createDirectConversation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { participantId } = req.body;

  // Check if participant ID is valid
  if (!mongoose.Types.ObjectId.isValid(participantId)) {
    return res.status(400).json({ error: 'Invalid participant ID' });
  }

  // Check if trying to create conversation with self
  if (userId === participantId) {
    return res.status(400).json({ error: 'Cannot create conversation with yourself' });
  }

  try {
    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      isGroupChat: false,
      $and: [
        { participants: userId },
        { participants: participantId }
      ]
    });

    if (existingConversation) {
      return res.status(200).json({
        message: 'Conversation already exists',
        conversation: existingConversation
      });
    }

    // Create new conversation
    const newConversation = new Conversation({
      isGroupChat: false,
      participants: [userId, participantId]
    });

    await newConversation.save();

    // Populate participant details
    await newConversation.populate('participants', 'username profilePicture');

    // Publish event via Redis for WebSocket
    const redisClient = req.app.get('redisClient');
    await redisClient.publish('conversation:new', JSON.stringify({
      conversation: newConversation,
      userId,
      participantId
    }));

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation: newConversation
    });
  } catch (error) {
    logger.error(`Create direct conversation error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Create a new group conversation
 */
exports.createGroupConversation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { name, participantIds } = req.body;

  // Ensure participantIds is an array and doesn't include the creator (added separately)
  const uniqueParticipantIds = [...new Set(participantIds)]
    .filter(id => id !== userId && mongoose.Types.ObjectId.isValid(id));

  // Add creator to participants
  const allParticipants = [userId, ...uniqueParticipantIds];

  // Check minimum number of participants for a group
  if (allParticipants.length < 3) {
    return res.status(400).json({ error: 'Group conversation requires at least 3 participants (including you)' });
  }

  try {
    // Create new group conversation
    const newConversation = new Conversation({
      name,
      isGroupChat: true,
      participants: allParticipants,
      groupAdmin: userId
    });

    await newConversation.save();

    // Populate participant details
    await newConversation.populate('participants', 'username profilePicture');
    await newConversation.populate('groupAdmin', 'username');

    // Create system message for group creation
    const systemMessage = new Message({
      conversation: newConversation._id,
      sender: userId,
      content: `${req.user.username} created the group "${name}"`,
      type: 'system'
    });

    await systemMessage.save();

    // Update conversation's lastMessage
    newConversation.lastMessage = systemMessage._id;
    await newConversation.save();

    // Publish event via Redis for WebSocket
    const redisClient = req.app.get('redisClient');
    await redisClient.publish('conversation:new:group', JSON.stringify({
      conversation: newConversation,
      participants: allParticipants,
      message: systemMessage
    }));

    res.status(201).json({
      message: 'Group conversation created successfully',
      conversation: newConversation
    });
  } catch (error) {
    logger.error(`Create group conversation error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Update group conversation details
 */
exports.updateGroupConversation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { conversationId } = req.params;
  const { name } = req.body;

  try {
    // Find the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      isGroupChat: true
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Group conversation not found' });
    }

    // Check if user is admin
    if (conversation.groupAdmin.toString() !== userId) {
      return res.status(403).json({ error: 'Only group admin can update group details' });
    }

    // Update the conversation
    conversation.name = name;
    await conversation.save();

    // Create system message for the update
    const systemMessage = new Message({
      conversation: conversationId,
      sender: userId,
      content: `${req.user.username} updated the group name to "${name}"`,
      type: 'system'
    });

    await systemMessage.save();

    // Update conversation's lastMessage
    conversation.lastMessage = systemMessage._id;
    await conversation.save();

    // Populate related fields
    await conversation.populate('participants', 'username profilePicture');
    await conversation.populate('groupAdmin', 'username');
    await conversation.populate('lastMessage');

    // Publish event via Redis for WebSocket
    const redisClient = req.app.get('redisClient');
    await redisClient.publish('conversation:update', JSON.stringify({
      conversation,
      message: systemMessage
    }));

    res.status(200).json({
      message: 'Group conversation updated successfully',
      conversation
    });
  } catch (error) {
    logger.error(`Update group conversation error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Add participants to a group conversation
 */
exports.addParticipants = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { conversationId } = req.params;
  const { participantIds } = req.body;

  // Validate participant IDs
  const validParticipantIds = participantIds
    .filter(id => mongoose.Types.ObjectId.isValid(id));

  if (validParticipantIds.length === 0) {
    return res.status(400).json({ error: 'No valid participant IDs provided' });
  }

  try {
    // Find the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      isGroupChat: true
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Group conversation not found' });
    }

    // Check if user is a participant
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'You are not a participant in this group' });
    }

    // Filter out participants that are already in the group
    const newParticipants = validParticipantIds
      .filter(id => !conversation.participants.includes(id));

    if (newParticipants.length === 0) {
      return res.status(400).json({ error: 'All provided participants are already in the group' });
    }

    // Add new participants
    conversation.participants.push(...newParticipants);
    await conversation.save();

    // Create system message
    const systemMessage = new Message({
      conversation: conversationId,
      sender: userId,
      content: `${req.user.username} added ${newParticipants.length} participant(s) to the group`,
      type: 'system'
    });

    await systemMessage.save();

    // Update conversation's lastMessage
    conversation.lastMessage = systemMessage._id;
    await conversation.save();

    // Populate related fields
    await conversation.populate('participants', 'username profilePicture');
    await conversation.populate('groupAdmin', 'username');
    await conversation.populate('lastMessage');

    // Publish event via Redis for WebSocket
    const redisClient = req.app.get('redisClient');
    await redisClient.publish('conversation:participants:add', JSON.stringify({
      conversation,
      newParticipants,
      message: systemMessage
    }));

    res.status(200).json({
      message: 'Participants added successfully',
      conversation
    });
  } catch (error) {
    logger.error(`Add participants error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Remove participant from a group conversation
 */
exports.removeParticipant = async (req, res) => {
  const userId = req.user.id;
  const { conversationId, participantId } = req.params;

  // Validate participant ID
  if (!mongoose.Types.ObjectId.isValid(participantId)) {
    return res.status(400).json({ error: 'Invalid participant ID' });
  }

  try {
    // Find the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      isGroupChat: true
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Group conversation not found' });
    }

    // Check if user is admin or the participant being removed is the user themselves (leaving)
    const isSelfRemoval = participantId === userId;
    const isAdmin = conversation.groupAdmin.toString() === userId;

    if (!isAdmin && !isSelfRemoval) {
      return res.status(403).json({ error: 'Only group admin can remove participants' });
    }

    // Check if participant is in the group
    if (!conversation.participants.includes(participantId)) {
      return res.status(400).json({ error: 'User is not a participant in this group' });
    }

    // Handle admin removal - transfer admin role if needed
    if (isAdmin && isSelfRemoval) {
      // Admin is leaving, transfer admin role to first participant
      const remainingParticipants = conversation.participants
        .filter(p => p.toString() !== userId);
      
      if (remainingParticipants.length > 0) {
        conversation.groupAdmin = remainingParticipants[0];
      }
    }

    // Remove participant
    conversation.participants = conversation.participants
      .filter(p => p.toString() !== participantId);

    // If no participants left, delete the conversation
    if (conversation.participants.length < 2) {
      await Conversation.findByIdAndDelete(conversationId);
      await Message.deleteMany({ conversation: conversationId });

      // Publish event via Redis for WebSocket
      const redisClient = req.app.get('redisClient');
      await redisClient.publish('conversation:delete', JSON.stringify({
        conversationId,
        participants: conversation.participants
      }));

      return res.status(200).json({
        message: 'Group deleted due to insufficient participants',
        deleted: true
      });
    }

    await conversation.save();

    // Create system message
    const actionUser = isSelfRemoval ? participantId : userId;
    const targetUser = participantId;
    const messageContent = isSelfRemoval 
      ? `User left the group` 
      : `${req.user.username} removed a participant from the group`;

    const systemMessage = new Message({
      conversation: conversationId,
      sender: actionUser,
      content: messageContent,
      type: 'system'
    });

    await systemMessage.save();

    // Update conversation's lastMessage
    conversation.lastMessage = systemMessage._id;
    await conversation.save();

    // Populate related fields
    await conversation.populate('participants', 'username profilePicture');
    await conversation.populate('groupAdmin', 'username');
    await conversation.populate('lastMessage');

    // Publish event via Redis for WebSocket
    const redisClient = req.app.get('redisClient');
    await redisClient.publish('conversation:participants:remove', JSON.stringify({
      conversation,
      removedParticipant: participantId,
      message: systemMessage
    }));

    res.status(200).json({
      message: isSelfRemoval ? 'Left group successfully' : 'Participant removed successfully',
      conversation
    });
  } catch (error) {
    logger.error(`Remove participant error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Mark conversation as read
 */
exports.markAsRead = async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;

  try {
    // Find the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Reset unread count for this user
    const unreadCount = new Map(conversation.unreadCount);
    unreadCount.set(userId.toString(), 0);
    conversation.unreadCount = unreadCount;
    await conversation.save();

    // Mark all unread messages as read
    await Message.updateMany(
      { 
        conversation: conversationId,
        'readBy.user': { $ne: userId },
        sender: { $ne: userId }
      },
      { 
        $addToSet: { 
          readBy: { 
            user: userId,
            readAt: new Date()
          } 
        } 
      }
    );

    // Publish event via Redis for WebSocket
    const redisClient = req.app.get('redisClient');
    await redisClient.publish('conversation:read', JSON.stringify({
      conversationId,
      userId
    }));

    res.status(200).json({
      message: 'Conversation marked as read'
    });
  } catch (error) {
    logger.error(`Mark as read error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};
