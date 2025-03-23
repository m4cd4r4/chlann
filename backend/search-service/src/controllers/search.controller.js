const { validationResult } = require('express-validator');
const searchService = require('../services/search.service');
const logger = require('../utils/logger');

/**
 * Search content across messages, conversations, users, and media
 */
exports.search = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const {
    query,
    contentTypes,
    conversationId,
    peopleTagged,
    startDate,
    endDate,
    page,
    limit
  } = req.query;

  try {
    // Parse contentTypes array if provided as a string
    let parsedContentTypes = contentTypes;
    if (contentTypes && typeof contentTypes === 'string') {
      parsedContentTypes = contentTypes.split(',');
    }

    // Parse peopleTagged array if provided as a string
    let parsedPeopleTagged = peopleTagged;
    if (peopleTagged && typeof peopleTagged === 'string') {
      parsedPeopleTagged = peopleTagged.split(',');
    }

    const searchResults = await searchService.searchContent({
      query,
      userId,
      contentTypes: parsedContentTypes,
      conversationId,
      peopleTagged: parsedPeopleTagged,
      startDate,
      endDate,
      page,
      limit
    });

    res.status(200).json(searchResults);
  } catch (error) {
    logger.error(`Search error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Index content for searching
 */
exports.indexContent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const {
    contentId,
    contentType,
    content,
    metadata,
    conversationId,
    peopleTagged
  } = req.body;

  try {
    const indexedContent = await searchService.indexContent({
      contentId,
      contentType,
      userId,
      content,
      metadata,
      conversationId,
      peopleTagged
    });

    res.status(201).json({
      message: 'Content indexed successfully',
      indexedContent
    });
  } catch (error) {
    logger.error(`Index content error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Delete content from search index
 */
exports.deleteContent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { contentId, contentType } = req.params;

  try {
    const result = await searchService.deleteContent({
      contentId,
      contentType,
      userId
    });

    res.status(200).json({
      message: result.deleted ? 'Content deleted from index' : 'Content not found in index',
      result
    });
  } catch (error) {
    logger.error(`Delete content error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Delete all content related to a conversation
 */
exports.deleteConversationContent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { conversationId } = req.params;

  try {
    const result = await searchService.deleteConversationContent(conversationId);

    res.status(200).json({
      message: result.deleted ? 'Conversation content deleted from index' : 'No conversation content found',
      result
    });
  } catch (error) {
    logger.error(`Delete conversation content error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Find similar content
 */
exports.findSimilarContent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { contentId, contentType } = req.params;

  try {
    const similarContent = await searchService.findSimilarContent(contentId, contentType, userId);

    res.status(200).json({
      similarContent
    });
  } catch (error) {
    logger.error(`Find similar content error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Search by person
 */
exports.searchByPerson = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { personId } = req.params;
  const { page, limit, contentTypes } = req.query;

  try {
    // Parse contentTypes array if provided as a string
    let parsedContentTypes = contentTypes;
    if (contentTypes && typeof contentTypes === 'string') {
      parsedContentTypes = contentTypes.split(',');
    }

    const searchResults = await searchService.searchContent({
      userId,
      contentTypes: parsedContentTypes,
      peopleTagged: [personId],
      page,
      limit
    });

    res.status(200).json(searchResults);
  } catch (error) {
    logger.error(`Search by person error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Search by date range
 */
exports.searchByDateRange = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { startDate, endDate, page, limit, contentTypes } = req.query;

  if (!startDate && !endDate) {
    return res.status(400).json({ error: 'At least one date parameter is required' });
  }

  try {
    // Parse contentTypes array if provided as a string
    let parsedContentTypes = contentTypes;
    if (contentTypes && typeof contentTypes === 'string') {
      parsedContentTypes = contentTypes.split(',');
    }

    const searchResults = await searchService.searchContent({
      userId,
      contentTypes: parsedContentTypes,
      startDate,
      endDate,
      page,
      limit
    });

    res.status(200).json(searchResults);
  } catch (error) {
    logger.error(`Search by date range error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Search in conversation
 */
exports.searchInConversation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { conversationId } = req.params;
  const { query, page, limit } = req.query;

  try {
    const searchResults = await searchService.searchContent({
      query,
      userId,
      contentTypes: ['message', 'media'],
      conversationId,
      page,
      limit
    });

    res.status(200).json(searchResults);
  } catch (error) {
    logger.error(`Search in conversation error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};
