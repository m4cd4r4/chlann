const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Media = require('../models/media.model');
const s3Service = require('../services/s3.service');
const imageService = require('../services/image.service');
const videoService = require('../services/video.service');
const { getExtensionFromMimeType } = require('../utils/fileTypes');
const axios = require('axios'); // For triggering search indexing

// Function to trigger search indexing (replace with actual service call if possible)
const triggerSearchIndex = async (mediaDoc) => {
  try {
    const searchServiceUrl = process.env.SEARCH_SERVICE_URL || 'http://search-service:3004';
    await axios.post(`${searchServiceUrl}/index`, {
      contentId: mediaDoc._id,
      contentType: 'media',
      userId: mediaDoc.userId,
      content: mediaDoc.caption || mediaDoc.originalFilename, // Basic content for indexing
      metadata: {
        mediaType: mediaDoc.mediaType,
        mimeType: mediaDoc.mimeType,
        width: mediaDoc.width,
        height: mediaDoc.height,
        duration: mediaDoc.duration,
        originalFilename: mediaDoc.originalFilename
      },
      conversationId: mediaDoc.conversationId,
      peopleTagged: mediaDoc.peopleTagged,
      createdAt: mediaDoc.createdAt
    });
    logger.info(`Triggered search indexing for media: ${mediaDoc._id}`);
  } catch (error) {
    logger.error(`Failed to trigger search indexing for media ${mediaDoc._id}: ${error.message}`);
    // Handle error appropriately (e.g., retry mechanism)
  }
};

// Function to trigger search index deletion
const triggerSearchDelete = async (mediaId) => {
   try {
    const searchServiceUrl = process.env.SEARCH_SERVICE_URL || 'http://search-service:3004';
    await axios.delete(`${searchServiceUrl}/delete/media/${mediaId}`);
    logger.info(`Triggered search index deletion for media: ${mediaId}`);
  } catch (error) {
    logger.error(`Failed to trigger search index deletion for media ${mediaId}: ${error.message}`);
  }
};


// Function to handle the actual media processing after upload confirmation
const processUploadedMedia = async (mediaId) => {
  let mediaDoc;
  try {
    mediaDoc = await Media.findById(mediaId);
    if (!mediaDoc || mediaDoc.uploadStatus !== 'processing') {
      logger.warn(`Media ${mediaId} not found or not in processing state.`);
      return;
    }

    // Determine the original file key from the versions (assuming it's stored during presigned URL generation)
    const originalKey = mediaDoc.versions?.original?.key;
    if (!originalKey) {
      throw new Error('Original key not found in media document');
    }

    // Download the original file from S3 to a temporary location
    // Note: This is simplified. In a real scenario, use streams or download to disk carefully.
    // For now, we assume imageService/videoService can handle S3 keys or require a local path.
    // If they require local path, download logic is needed here.
    // Let's assume services can handle S3 key for now (needs adjustment if not)

    let processedData;
    if (mediaDoc.mediaType === 'image') {
      // Assuming imageService.processImage needs the S3 key and user ID
      processedData = await imageService.processImage(
        originalKey, // Pass S3 key instead of buffer/path
        mediaDoc.userId,
        mediaDoc.mimeType,
        mediaDoc.originalFilename
      );
    } else if (mediaDoc.mediaType === 'video') {
      // Assuming videoService.processVideo needs the S3 key and user ID
      // It might need download first, adjust if necessary
      processedData = await videoService.processVideo(
        originalKey, // Pass S3 key instead of path
        mediaDoc.userId,
        mediaDoc.mimeType,
        mediaDoc.originalFilename
      );
    } else {
      throw new Error(`Unsupported media type: ${mediaDoc.mediaType}`);
    }

    // Update Media document with processed data
    mediaDoc.versions = processedData.processedVersions; // Store detailed version info
    mediaDoc.width = processedData.width;
    mediaDoc.height = processedData.height;
    mediaDoc.duration = processedData.duration; // Only for video
    mediaDoc.videoThumbnails = processedData.processedVersions?.thumbnails || []; // Only for video
    mediaDoc.primaryThumbnailUrl = processedData.primaryThumbnail || processedData.processedVersions?.thumbnail?.url;
    mediaDoc.uploadStatus = 'completed';
    mediaDoc.processingError = undefined;

    await mediaDoc.save();
    logger.info(`Successfully processed media: ${mediaId}`);

    // Trigger search indexing
    await triggerSearchIndex(mediaDoc);

  } catch (error) {
    logger.error(`Error processing media ${mediaId}: ${error.message}`);
    if (mediaDoc) {
      mediaDoc.uploadStatus = 'failed';
      mediaDoc.processingError = error.message;
      await mediaDoc.save();
    }
  }
};


const mediaController = {
  // Get presigned URL for direct upload
  getPresignedUploadUrl: async (req, res) => {
    const userId = req.user.id; // Assuming userId is available from auth middleware
    const { filename, mimeType, conversationId, messageId } = req.body;

    if (!filename || !mimeType) {
      return res.status(400).json({ error: 'Filename and mimeType are required' });
    }

    const mediaType = mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : null;
    if (!mediaType) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const extension = getExtensionFromMimeType(mimeType) || filename.split('.').pop();
    const keyPrefix = mediaType === 'image' ? 'images/' : 'videos/';
    const uniqueKey = s3Service.generateUniqueKey(userId, extension, keyPrefix);

    try {
      // Generate presigned URL
      const presignedData = await s3Service.getPresignedUploadUrl(uniqueKey, mimeType);

      // Create initial Media document
      const newMedia = new Media({
        userId,
        conversationId,
        messageId,
        mediaType,
        mimeType,
        originalFilename: filename,
        versions: {
          original: { key: uniqueKey, url: '' } // Store key initially, URL might be generated later or based on key
        },
        uploadStatus: 'pending', // Will change to 'uploading' on client side, then 'processing' on confirm
      });
      await newMedia.save();

      return res.status(200).json({
        presignedUrl: presignedData.url,
        key: uniqueKey,
        mediaId: newMedia._id // Return the ID of the created Media document
      });
    } catch (error) {
      logger.error(`Error generating presigned URL: ${error.message}`);
      return res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },

  // Confirm upload completion and trigger processing
  confirmUpload: async (req, res) => {
    const { mediaId } = req.body;
    const userId = req.user.id;

    if (!mediaId || !mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({ error: 'Valid mediaId is required' });
    }

    try {
      const mediaDoc = await Media.findOne({ _id: mediaId, userId });

      if (!mediaDoc) {
        return res.status(404).json({ error: 'Media record not found or access denied' });
      }

      // Verify file exists in S3 (optional but recommended)
      const originalKey = mediaDoc.versions?.original?.key;
      if (!originalKey) {
         return res.status(400).json({ error: 'Original key missing in media record' });
      }
      try {
        await s3Service.getFileMetadata(originalKey);
      } catch (s3Error) {
        logger.error(`S3 verification failed for key ${originalKey}: ${s3Error.message}`);
        mediaDoc.uploadStatus = 'failed';
        mediaDoc.processingError = 'S3 verification failed after upload.';
        await mediaDoc.save();
        return res.status(400).json({ error: 'File verification failed in storage' });
      }


      // Update status to processing
      mediaDoc.uploadStatus = 'processing';
      await mediaDoc.save();

      // Trigger background processing (fire-and-forget)
      processUploadedMedia(mediaId).catch(err => {
        // Catch errors from the async background process if needed, though errors are handled internally
        logger.error(`Background processing initiation failed for ${mediaId}: ${err.message}`);
      });

      // Respond immediately
      return res.status(200).json({
        message: 'Upload confirmed, processing started.',
        mediaId,
        status: 'processing'
      });
    } catch (error) {
      logger.error(`Error confirming upload for media ${mediaId}: ${error.message}`);
      return res.status(500).json({ error: 'Failed to confirm upload' });
    }
  },

  // Get media list for the authenticated user
  getMediaList: async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20, conversationId, mediaType } = req.query;

    try {
      const query = { userId, uploadStatus: 'completed' };
      if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
        query.conversationId = conversationId;
      }
      if (mediaType && ['image', 'video'].includes(mediaType)) {
        query.mediaType = mediaType;
      }

      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 },
        select: '-versions.original -versions.small -versions.medium -versions.large -versions.processed_video -videoThumbnails.key' // Exclude large data by default
      };

      // Use mongoose-paginate-v2 if available, otherwise basic pagination
      const mediaList = await Media.find(query)
         .sort(options.sort)
         .skip((options.page - 1) * options.limit)
         .limit(options.limit)
         .select(options.select)
         .lean(); // Use lean for performance

      const totalCount = await Media.countDocuments(query);

      return res.status(200).json({
        media: mediaList,
        pagination: {
          total: totalCount,
          page: options.page,
          limit: options.limit,
          pages: Math.ceil(totalCount / options.limit)
        }
      });
    } catch (error) {
      logger.error(`Error getting media list: ${error.message}`);
      return res.status(500).json({ error: 'Failed to get media list' });
    }
  },

  // Get single media by ID
  getMediaById: async (req, res) => {
    const userId = req.user.id;
    const { mediaId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({ error: 'Invalid media ID' });
    }

    try {
      const media = await Media.findOne({ _id: mediaId, userId, uploadStatus: 'completed' }).lean();

      if (!media) {
        return res.status(404).json({ error: 'Media not found or access denied' });
      }

      // Generate presigned URLs for versions if needed (e.g., if S3 bucket is private)
      // This depends on whether URLs stored are public or need signing.
      // Example: media.versions.large.url = await s3Service.getPresignedGetUrl(media.versions.large.key);

      return res.status(200).json(media);
    } catch (error) {
      logger.error(`Error getting media by ID ${mediaId}: ${error.message}`);
      return res.status(500).json({ error: 'Failed to get media' });
    }
  },

  // Update media metadata (e.g., caption, people tagged)
  updateMedia: async (req, res) => {
    const userId = req.user.id;
    const { mediaId } = req.params;
    const { caption, peopleTagged } = req.body; // Add other updatable fields as needed

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({ error: 'Invalid media ID' });
    }

    try {
      const media = await Media.findOne({ _id: mediaId, userId });

      if (!media) {
        return res.status(404).json({ error: 'Media not found or access denied' });
      }

      // Update fields
      if (caption !== undefined) {
        media.caption = caption;
      }
      if (peopleTagged !== undefined && Array.isArray(peopleTagged)) {
         // Validate peopleTagged IDs if necessary
        media.peopleTagged = peopleTagged.filter(id => mongoose.Types.ObjectId.isValid(id));
      }

      await media.save();

      // Trigger re-indexing in search service
      await triggerSearchIndex(media);

      return res.status(200).json({
        message: 'Media updated successfully',
        media: media.toObject() // Return updated document
      });
    } catch (error) {
      logger.error(`Error updating media ${mediaId}: ${error.message}`);
      return res.status(500).json({ error: 'Failed to update media' });
    }
  },

  // Delete media
  deleteMedia: async (req, res) => {
    const userId = req.user.id;
    const { mediaId } = req.params;

     if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({ error: 'Invalid media ID' });
    }

    try {
      const media = await Media.findOne({ _id: mediaId, userId });

      if (!media) {
        return res.status(404).json({ error: 'Media not found or access denied' });
      }

      // Collect all S3 keys to delete
      const keysToDelete = [];
      if (media.versions?.original?.key) keysToDelete.push(media.versions.original.key);
      if (media.versions?.thumbnail?.key) keysToDelete.push(media.versions.thumbnail.key);
      if (media.versions?.small?.key) keysToDelete.push(media.versions.small.key);
      if (media.versions?.medium?.key) keysToDelete.push(media.versions.medium.key);
      if (media.versions?.large?.key) keysToDelete.push(media.versions.large.key);
      if (media.versions?.processed_video?.key) keysToDelete.push(media.versions.processed_video.key);
      media.videoThumbnails?.forEach(thumb => keysToDelete.push(thumb.key));

      // Delete from S3
      const deletePromises = keysToDelete.map(key => s3Service.deleteFile(key).catch(err => {
        // Log error but continue trying to delete others and the DB record
        logger.error(`Failed to delete S3 key ${key} for media ${mediaId}: ${err.message}`);
      }));
      await Promise.all(deletePromises);

      // Delete from MongoDB
      await Media.deleteOne({ _id: mediaId });

      // Trigger deletion from search index
      await triggerSearchDelete(mediaId);

      return res.status(200).json({
        message: 'Media deleted successfully',
        id: mediaId
      });
    } catch (error) {
      logger.error(`Error deleting media ${mediaId}: ${error.message}`);
      return res.status(500).json({ error: 'Failed to delete media' });
    }
  }
  // Removed mock search and stats endpoints - they belong in search-service
};

module.exports = mediaController;
