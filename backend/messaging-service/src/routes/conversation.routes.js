const express = require('express');
const { body, param } = require('express-validator');
const conversationController = require('../controllers/conversation.controller');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// Get all conversations for the authenticated user
router.get('/', conversationController.getConversations);

// Get a single conversation by ID
router.get(
  '/:conversationId',
  param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
  conversationController.getConversationById
);

// Create a new direct conversation
router.post(
  '/direct',
  body('participantId').isMongoId().withMessage('Invalid participant ID'),
  conversationController.createDirectConversation
);

// Create a new group conversation
router.post(
  '/group',
  [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Group name must be between 3 and 100 characters'),
    body('participantIds')
      .isArray({ min: 2 })
      .withMessage('At least 2 other participants are required for a group')
  ],
  conversationController.createGroupConversation
);

// Update a group conversation
router.put(
  '/:conversationId',
  [
    param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
    body('name')
      .isString()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Group name must be between 3 and 100 characters')
  ],
  conversationController.updateGroupConversation
);

// Add participants to a group conversation
router.post(
  '/:conversationId/participants',
  [
    param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
    body('participantIds')
      .isArray({ min: 1 })
      .withMessage('At least 1 participant ID is required')
  ],
  conversationController.addParticipants
);

// Remove a participant from a group conversation
router.delete(
  '/:conversationId/participants/:participantId',
  [
    param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
    param('participantId').isMongoId().withMessage('Invalid participant ID')
  ],
  conversationController.removeParticipant
);

// Mark conversation as read
router.post(
  '/:conversationId/read',
  param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
  conversationController.markAsRead
);

module.exports = router;
