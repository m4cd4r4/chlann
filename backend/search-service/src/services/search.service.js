const SearchIndex = require('../models/search-index.model');
const logger = require('../utils/logger');

/**
 * Index content for searching
 * @param {Object} params - Content parameters
 * @returns {Promise<Object>} Indexed document
 */
const indexContent = async (params) => {
  try {
    const {
      contentId,
      contentType,
      userId,
      content,
      metadata = {},
      conversationId,
      peopleTagged = []
    } = params;

    // Check if document already exists
    const existingDoc = await SearchIndex.findOne({
      contentId,
      contentType,
      userId
    });

    if (existingDoc) {
      // Update existing document
      existingDoc.content = content;
      existingDoc.metadata = { ...existingDoc.metadata, ...metadata };
      existingDoc.conversationId = conversationId || existingDoc.conversationId;
      
      if (peopleTagged && peopleTagged.length > 0) {
        existingDoc.peopleTagged = peopleTagged;
      }
      
      existingDoc.updatedAt = new Date();
      
      await existingDoc.save();
      return existingDoc;
    }

    // Create new document
    const searchDoc = new SearchIndex({
      contentId,
      contentType,
      userId,
      content,
      metadata,
      conversationId,
      peopleTagged,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await searchDoc.save();
    return searchDoc;
  } catch (error) {
    logger.error(`Error indexing content: ${error.message}`);
    throw error;
  }
};

/**
 * Search content with advanced filtering
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Search results
 */
const searchContent = async (params) => {
  try {
    const {
      query,
      userId,
      contentTypes = ['message', 'conversation', 'user', 'media'],
      conversationId,
      peopleTagged,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = params;

    // Build search query
    const searchQuery = { userId };

    // Add text search if query provided
    if (query && query.trim() !== '') {
      searchQuery.$text = { $search: query };
    }

    // Filter by content types
    if (contentTypes && contentTypes.length > 0) {
      searchQuery.contentType = { $in: contentTypes };
    }

    // Filter by conversation
    if (conversationId) {
      searchQuery.conversationId = conversationId;
    }

    // Filter by people tagged
    if (peopleTagged && peopleTagged.length > 0) {
      searchQuery.peopleTagged = { $in: peopleTagged };
    }

    // Filter by date range
    if (startDate || endDate) {
      searchQuery.createdAt = {};
      if (startDate) {
        searchQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        searchQuery.createdAt.$lte = new Date(endDate);
      }
    }

    // Execute search with pagination
    const totalResults = await SearchIndex.countDocuments(searchQuery);
    
    let searchResults;
    
    if (query && query.trim() !== '') {
      // If there's a text query, sort by text score
      searchResults = await SearchIndex.find(
        searchQuery,
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));
    } else {
      // Otherwise, sort by date
      searchResults = await SearchIndex.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));
    }

    return {
      results: searchResults,
      pagination: {
        total: totalResults,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalResults / parseInt(limit))
      }
    };
  } catch (error) {
    logger.error(`Error searching content: ${error.message}`);
    throw error;
  }
};

/**
 * Delete content from search index
 * @param {Object} params - Delete parameters
 * @returns {Promise<Object>} Deletion result
 */
const deleteContent = async (params) => {
  try {
    const { contentId, contentType, userId } = params;

    const result = await SearchIndex.deleteOne({
      contentId,
      contentType,
      userId
    });

    return {
      deleted: result.deletedCount > 0,
      count: result.deletedCount
    };
  } catch (error) {
    logger.error(`Error deleting content from index: ${error.message}`);
    throw error;
  }
};

/**
 * Delete all content related to a conversation
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteConversationContent = async (conversationId) => {
  try {
    const result = await SearchIndex.deleteMany({
      conversationId
    });

    return {
      deleted: result.deletedCount > 0,
      count: result.deletedCount
    };
  } catch (error) {
    logger.error(`Error deleting conversation content: ${error.message}`);
    throw error;
  }
};

/**
 * Find similar content
 * @param {string} contentId - Content ID to find similar items for
 * @param {string} contentType - Content type
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Similar content
 */
const findSimilarContent = async (contentId, contentType, userId) => {
  try {
    // Get the content to find similar items for
    const sourceContent = await SearchIndex.findOne({
      contentId,
      contentType,
      userId
    });

    if (!sourceContent) {
      throw new Error('Source content not found');
    }

    // Create an aggregation pipeline for more advanced similarity
    const similarResults = await SearchIndex.aggregate([
      {
        $match: {
          userId,
          contentType,
          contentId: { $ne: contentId }, // Exclude the source content
          $text: { $search: sourceContent.content }
        }
      },
      {
        $addFields: {
          similarity: { $meta: 'textScore' }
        }
      },
      {
        $match: {
          similarity: { $gt: 0.5 } // Only include results with decent similarity
        }
      },
      {
        $sort: { similarity: -1 }
      },
      {
        $limit: 10
      }
    ]);

    return similarResults;
  } catch (error) {
    logger.error(`Error finding similar content: ${error.message}`);
    throw error;
  }
};

module.exports = {
  indexContent,
  searchContent,
  deleteContent,
  deleteConversationContent,
  findSimilarContent
};
