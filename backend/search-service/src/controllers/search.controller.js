const logger = require('../utils/logger');
const searchService = require('../services/search.service');
const mongoose = require('mongoose');

const searchController = {
  // Main search endpoint
  search: async (req, res) => {
    try {
      const userId = req.user.id; // Assuming userId from auth middleware
      const {
        query = '',
        contentTypes,
        conversationId,
        peopleTagged,
        startDate,
        endDate,
        page = 1,
        limit = 20 // Default limit from service
      } = req.query;

      const searchParams = {
        userId,
        query,
        contentTypes: contentTypes ? contentTypes.split(',') : undefined,
        conversationId,
        peopleTagged: peopleTagged ? peopleTagged.split(',') : undefined,
        startDate,
        endDate,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      logger.info(`Search request received for user ${userId}: ${query}`);
      const results = await searchService.searchContent(searchParams);

      return res.status(200).json(results);
    } catch (error) {
      logger.error(`Error in search: ${error.message}`);
      return res.status(500).json({ error: 'Search operation failed' });
    }
  },

  // Index content for searching (called internally or via specific endpoint)
  indexContent: async (req, res) => {
    try {
      // Assuming body contains necessary fields from other services
      const {
        contentId,
        contentType,
        userId, // May need to get this from the request or assume internal call
        content,
        metadata = {},
        conversationId,
        peopleTagged = [],
        createdAt // Optional, defaults in model/service
      } = req.body;

      if (!contentId || !contentType || !userId || !content) {
         return res.status(400).json({ error: 'Missing required fields for indexing' });
      }

      const indexParams = {
        contentId, contentType, userId, content, metadata, conversationId, peopleTagged, createdAt
      };

      logger.info(`Indexing content: ${contentType}/${contentId} for user ${userId}`);
      const indexedDoc = await searchService.indexContent(indexParams);

      return res.status(200).json({
        message: 'Content indexed successfully',
        doc: indexedDoc
      });
    } catch (error) {
      logger.error(`Error indexing content: ${error.message}`);
      return res.status(500).json({ error: 'Failed to index content' });
    }
  },

  // Delete content from search index
  deleteContent: async (req, res) => {
    try {
      const userId = req.user.id; // Assuming userId from auth middleware
      const { contentType, contentId } = req.params;

      if (!contentType || !contentId) {
        return res.status(400).json({ error: 'contentType and contentId are required' });
      }

      logger.info(`Deleting content from index: ${contentType}/${contentId} for user ${userId}`);
      const result = await searchService.deleteContent({ contentId, contentType, userId });

      if (!result.deleted) {
        return res.status(404).json({ message: 'Content not found in index or access denied' });
      }

      return res.status(200).json({
        message: 'Content deleted from index',
        contentId,
        contentType,
        count: result.count
      });
    } catch (error) {
      logger.error(`Error deleting content: ${error.message}`);
      return res.status(500).json({ error: 'Failed to delete content' });
    }
  },

  // Delete all content related to a conversation (potentially admin only?)
  deleteConversationContent: async (req, res) => {
    try {
      const { conversationId } = req.params;

      if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ error: 'Valid conversationId is required' });
      }

      // Add authorization check here if needed (e.g., only admin or participants)

      logger.info(`Deleting all content for conversation: ${conversationId}`);
      const result = await searchService.deleteConversationContent(conversationId);

      return res.status(200).json({
        message: 'Conversation content deleted from index',
        conversationId,
        count: result.count
      });
    } catch (error) {
      logger.error(`Error deleting conversation content: ${error.message}`);
      return res.status(500).json({ error: 'Failed to delete conversation content' });
    }
  },

  // Find similar content
  findSimilarContent: async (req, res) => {
    try {
      const userId = req.user.id; // Assuming userId from auth middleware
      const { contentType, contentId } = req.params;

      if (!contentType || !contentId) {
        return res.status(400).json({ error: 'contentType and contentId are required' });
      }

      logger.info(`Finding similar content to: ${contentType}/${contentId} for user ${userId}`);
      const results = await searchService.findSimilarContent(contentId, contentType, userId);

      return res.status(200).json({
        results,
        sourceContent: {
          id: contentId,
          type: contentType
        }
      });
    } catch (error) {
      logger.error(`Error finding similar content: ${error.message}`);
      // Handle specific errors like 'Source content not found'
      if (error.message === 'Source content not found') {
        return res.status(404).json({ error: 'Source content not found' });
      }
      return res.status(500).json({ error: 'Failed to find similar content' });
    }
  },

  // Specific search endpoints (delegate to main search with filters)

  searchByPerson: async (req, res) => {
    req.query.peopleTagged = req.params.personId;
    return searchController.search(req, res); // Reuse main search logic
  },

  searchByDateRange: async (req, res) => {
    // startDate and endDate are already in req.query
    return searchController.search(req, res); // Reuse main search logic
  },

  searchInConversation: async (req, res) => {
    req.query.conversationId = req.params.conversationId;
    return searchController.search(req, res); // Reuse main search logic
  }
};

module.exports = searchController;
