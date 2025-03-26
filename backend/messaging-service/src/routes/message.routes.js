const express = require('express');
const { body, param, query } = require('express-validator');
const messageController = require('../controllers/message.controller');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// Get messages for a conversation
router.get(
  '/:conversationId',
  [
    param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('before').optional().isMongoId().withMessage('Invalid message ID for pagination')
  ],
  messageController.getMessages
);

// Send a new message
router.post(
  '/:conversationId',
  [
    param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
    body('type').optional().isIn(['text', 'image', 'video', 'link', 'system']).withMessage('Invalid message type'),
    body('replyTo').optional().isMongoId().withMessage('Invalid reply message ID'),
    body('media').optional().isArray().withMessage('Media must be an array')
  ],
  messageController.sendMessage
);

// Delete a message
router.delete(
  '/:messageId',
  param('messageId').isMongoId().withMessage('Invalid message ID'),
  messageController.deleteMessage
);

// Edit a message
router.put(
  '/:messageId',
  [
    param('messageId').isMongoId().withMessage('Invalid message ID'),
    body('content').isString().trim().notEmpty().withMessage('Message content is required')
  ],
  messageController.editMessage
);

// React to a message
router.post(
  '/:messageId/reactions',
  [
    param('messageId').isMongoId().withMessage('Invalid message ID'),
    body('reaction').isString().trim().notEmpty().withMessage('Reaction emoji is required')
  ],
  messageController.reactToMessage
);

module.exports = router;
