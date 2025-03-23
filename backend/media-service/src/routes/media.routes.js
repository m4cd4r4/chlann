const express = require('express');
const { body, param, query } = require('express-validator');
const mediaController = require('../controllers/media.controller');
const { verifyToken } = require('../middleware/auth');
const { upload, uploadImage, uploadVideo } = require('../middleware/upload');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// Upload media file (image or video)
router.post(
  '/upload',
  upload('media'),
  [
    body('conversationId').optional().isMongoId().withMessage('Invalid conversation ID'),
    body('messageId').optional().isMongoId().withMessage('Invalid message ID'),
    body('peopleTagged').optional().isString().withMessage('People tagged must be a string'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
  ],
  mediaController.uploadMedia
);

// Get presigned URL for direct upload
router.post(
  '/presigned-url',
  [
    body('fileName').notEmpty().withMessage('File name is required'),
    body('fileType').notEmpty().withMessage('File type is required'),
    body('fileSize').isInt({ min: 1 }).withMessage('File size must be a positive integer')
  ],
  mediaController.getPresignedUploadUrl
);

// Confirm upload completion and trigger processing
router.post(
  '/confirm-upload',
  [
    body('mediaId').isMongoId().withMessage('Invalid media ID'),
    body('conversationId').optional().isMongoId().withMessage('Invalid conversation ID'),
    body('messageId').optional().isMongoId().withMessage('Invalid message ID'),
    body('peopleTagged').optional().isArray().withMessage('People tagged must be an array')
  ],
  mediaController.confirmUpload
);

// Get a list of media items with various filters
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('mediaType').optional().isIn(['image', 'video']).withMessage('Invalid media type'),
    query('conversationId').optional().isMongoId().withMessage('Invalid conversation ID'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date')
  ],
  mediaController.getMediaList
);

// Get a single media item by ID
router.get(
  '/:mediaId',
  param('mediaId').isMongoId().withMessage('Invalid media ID'),
  mediaController.getMediaById
);

// Update media metadata
router.put(
  '/:mediaId',
  [
    param('mediaId').isMongoId().withMessage('Invalid media ID'),
    body('peopleTagged').optional().isArray().withMessage('People tagged must be an array'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
  ],
  mediaController.updateMedia
);

// Delete media
router.delete(
  '/:mediaId',
  param('mediaId').isMongoId().withMessage('Invalid media ID'),
  mediaController.deleteMedia
);

// Search media by various criteria
router.get(
  '/search',
  [
    query('query').optional().isString().withMessage('Search query must be a string'),
    query('mediaType').optional().isIn(['image', 'video']).withMessage('Invalid media type'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  mediaController.searchMedia
);

// Get media by people tagged
router.get(
  '/people/:personId',
  [
    param('personId').isMongoId().withMessage('Invalid person ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  mediaController.getMediaByPeopleTagged
);

// Get media by date range
router.get(
  '/date-range',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  mediaController.getMediaByDateRange
);

// Get media statistics
router.get(
  '/stats',
  mediaController.getMediaStats
);

module.exports = router;
