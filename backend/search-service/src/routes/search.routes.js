const express = require('express');
const { query, body, param } = require('express-validator');
const searchController = require('../controllers/search.controller');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// General search endpoint with advanced filtering
router.get(
  '/',
  [
    query('query').optional().isString().withMessage('Search query must be a string'),
    query('contentTypes').optional().isString().withMessage('Content types must be a comma-separated string'),
    query('conversationId').optional().isMongoId().withMessage('Invalid conversation ID'),
    query('peopleTagged').optional().isString().withMessage('People tagged must be a comma-separated string'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  searchController.search
);

// Index content for searching
router.post(
  '/index',
  [
    body('contentId').isMongoId().withMessage('Invalid content ID'),
    body('contentType').isIn(['message', 'conversation', 'user', 'media']).withMessage('Invalid content type'),
    body('content').isString().notEmpty().withMessage('Content is required'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object'),
    body('conversationId').optional().isMongoId().withMessage('Invalid conversation ID'),
    body('peopleTagged').optional().isArray().withMessage('People tagged must be an array')
  ],
  searchController.indexContent
);

// Delete content from search index
router.delete(
  '/:contentType/:contentId',
  [
    param('contentType').isIn(['message', 'conversation', 'user', 'media']).withMessage('Invalid content type'),
    param('contentId').isMongoId().withMessage('Invalid content ID')
  ],
  searchController.deleteContent
);

// Delete all content related to a conversation
router.delete(
  '/conversation/:conversationId',
  param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
  searchController.deleteConversationContent
);

// Find similar content
router.get(
  '/similar/:contentType/:contentId',
  [
    param('contentType').isIn(['message', 'conversation', 'user', 'media']).withMessage('Invalid content type'),
    param('contentId').isMongoId().withMessage('Invalid content ID')
  ],
  searchController.findSimilarContent
);

// Search by person
router.get(
  '/person/:personId',
  [
    param('personId').isMongoId().withMessage('Invalid person ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('contentTypes').optional().isString().withMessage('Content types must be a comma-separated string')
  ],
  searchController.searchByPerson
);

// Search by date range
router.get(
  '/date-range',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('contentTypes').optional().isString().withMessage('Content types must be a comma-separated string')
  ],
  searchController.searchByDateRange
);

// Search in conversation
router.get(
  '/conversation/:conversationId',
  [
    param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
    query('query').optional().isString().withMessage('Search query must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  searchController.searchInConversation
);

module.exports = router;
