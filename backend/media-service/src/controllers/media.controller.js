const fs = require('fs');
const { validationResult } = require('express-validator');
const Media = require('../models/media.model');
const imageService = require('../services/image.service');
const videoService = require('../services/video.service');
const s3Service = require('../services/s3.service');
const logger = require('../utils/logger');
const { isAllowedImage, isAllowedVideo, getMediaTypeFromMimeType } = require('../utils/fileTypes');

/**
 * Upload a media file (image or video)
 */
exports.uploadMedia = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Ensure file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { path: filePath, originalname, mimetype, size } = req.file;
  const userId = req.user.id;
  const { conversationId, messageId } = req.body;

  try {
    // Determine media type
    const mediaType = getMediaTypeFromMimeType(mimetype);
    
    if (!mediaType) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Create media record
    const media = new Media({
      fileName: req.file.filename,
      originalName: originalname,
      mimeType: mimetype,
      size,
      uploadedBy: userId,
      mediaType,
      bucket: s3Service.bucketName,
      key: '', // Will be updated after processing
      originalUrl: '', // Will be updated after processing
      peopleTagged: req.body.peopleTagged ? JSON.parse(req.body.peopleTagged) : [],
      conversationId: conversationId || null,
      messageId: messageId || null,
      isPublic: req.body.isPublic === 'true',
      status: 'processing'
    });

    await media.save();

    // Process file based on type
    let result;
    if (mediaType === 'image') {
      // Process image
      result = await imageService.processImage(filePath, userId, mimetype, originalname);
      
      // Update media record with processed data
      media.key = result.originalKey;
      media.originalUrl = result.original;
      media.thumbnailUrl = result.thumbnail;
      media.width = result.width;
      media.height = result.height;
      media.processedUrls = {
        original: result.original,
        thumbnail: result.thumbnail,
        small: result.small,
        medium: result.medium,
        large: result.large
      };
      media.metadata = {
        ...media.metadata,
        processedKeys: {
          original: result.originalKey,
          thumbnail: result.thumbnailKey,
          small: result.smallKey,
          medium: result.mediumKey,
          large: result.largeKey
        }
      };
    } else if (mediaType === 'video') {
      // Process video
      result = await videoService.processVideo(filePath, userId, mimetype, originalname);
      
      // Update media record with processed data
      media.key = result.videoKey;
      media.originalUrl = result.video;
      media.thumbnailUrl = result.primaryThumbnail;
      media.width = result.width;
      media.height = result.height;
      media.duration = result.duration;
      media.processedUrls = {
        video: result.video,
        thumbnails: result.thumbnails
      };
      media.metadata = {
        ...media.metadata,
        processedKeys: {
          video: result.videoKey,
          thumbnails: result.thumbnailKeys
        },
        bitrate: result.bitrate,
        codec: result.codec
      };
    }

    // Update status
    media.status = 'ready';
    await media.save();

    // Clean up temp file
    fs.unlinkSync(filePath);

    res.status(201).json({
      message: 'Media uploaded and processed successfully',
      media
    });
  } catch (error) {
    logger.error(`Media upload error: ${error.message}`);
    
    // If we've created a media record, update it with the error
    if (media && media._id) {
      media.status = 'error';
      media.processingError = error.message;
      await media.save();
    }
    
    // Clean up temp file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get presigned URLs for direct upload to S3
 */
exports.getPresignedUploadUrl = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { fileName, fileType, fileSize } = req.body;

  try {
    // Validate file type
    const mediaType = getMediaTypeFromMimeType(fileType);
    
    if (!mediaType) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Validate file size
    const maxSize = mediaType === 'image' 
      ? parseInt(process.env.MAX_IMAGE_SIZE || '20') * 1024 * 1024 
      : parseInt(process.env.MAX_VIDEO_SIZE || '100') * 1024 * 1024;
    
    if (fileSize > maxSize) {
      return res.status(413).json({ 
        error: 'File too large',
        message: `File size exceeds the limit of ${maxSize / (1024 * 1024)}MB for ${mediaType}s`
      });
    }

    // Generate key and get presigned URL
    const extension = fileName.split('.').pop() || 'bin';
    const prefix = mediaType === 'image' ? 'images/' : 'videos/';
    const key = s3Service.generateUniqueKey(userId, extension, prefix);
    
    const presignedUrl = await s3Service.getPresignedUploadUrl(key, fileType);

    // Create media record in 'uploading' state
    const media = new Media({
      fileName: key.split('/').pop(),
      originalName: fileName,
      mimeType: fileType,
      size: fileSize,
      uploadedBy: userId,
      mediaType,
      bucket: s3Service.bucketName,
      key,
      originalUrl: presignedUrl.url.split('?')[0], // URL without query params
      status: 'uploading'
    });

    await media.save();

    res.status(200).json({
      uploadUrl: presignedUrl.url,
      key,
      mediaId: media._id,
      expiresIn: presignedUrl.expiresIn
    });
  } catch (error) {
    logger.error(`Presigned URL generation error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Confirm completion of a direct upload
 */
exports.confirmUpload = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { mediaId, conversationId, messageId, peopleTagged } = req.body;

  try {
    // Find the media record
    const media = await Media.findOne({
      _id: mediaId,
      uploadedBy: userId
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Check if the media is already processed
    if (media.status === 'ready') {
      return res.status(200).json({
        message: 'Media already processed',
        media
      });
    }

    // Update media record
    media.status = 'processing';
    if (conversationId) media.conversationId = conversationId;
    if (messageId) media.messageId = messageId;
    if (peopleTagged) media.peopleTagged = peopleTagged;
    
    await media.save();

    // Process the uploaded file based on media type
    if (media.mediaType === 'image') {
      // Get the file from S3
      const fileContent = await s3Service.getFileContent(media.key);
      
      // Process image
      const result = await imageService.processImage(
        fileContent,
        userId,
        media.mimeType,
        media.originalName
      );
      
      // Update media record with processed data
      media.thumbnailUrl = result.thumbnail;
      media.width = result.width;
      media.height = result.height;
      media.processedUrls = {
        original: result.original,
        thumbnail: result.thumbnail,
        small: result.small,
        medium: result.medium,
        large: result.large
      };
      media.metadata = {
        ...media.metadata,
        processedKeys: {
          original: result.originalKey,
          thumbnail: result.thumbnailKey,
          small: result.smallKey,
          medium: result.mediumKey,
          large: result.largeKey
        }
      };
    } else if (media.mediaType === 'video') {
      // For videos, client-side uploading might not be efficient for processing
      // This would be better handled via a background job
      
      // For now, we'll just mark it as ready without additional processing
      media.status = 'ready';
      media.metadata = {
        ...media.metadata,
        needs_processing: true
      };
    }

    // Update status
    media.status = 'ready';
    await media.save();

    res.status(200).json({
      message: 'Upload confirmed and processing completed',
      media
    });
  } catch (error) {
    logger.error(`Confirm upload error: ${error.message}`);
    
    // If we have a media record, update it with the error
    if (media) {
      media.status = 'error';
      media.processingError = error.message;
      await media.save();
    }
    
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get a list of media items
 */
exports.getMediaList = async (req, res) => {
  const userId = req.user.id;
  const { 
    page = 1, 
    limit = 20, 
    mediaType, 
    conversationId,
    startDate,
    endDate,
    peopleTagged
  } = req.query;

  try {
    // Build query
    const query = { uploadedBy: userId };
    
    if (mediaType) {
      query.mediaType = mediaType;
    }
    
    if (conversationId) {
      query.conversationId = conversationId;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    if (peopleTagged) {
      query.peopleTagged = { $in: peopleTagged.split(',') };
    }

    // Execute query with pagination
    const totalMedia = await Media.countDocuments(query);
    const mediaItems = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      media: mediaItems,
      pagination: {
        total: totalMedia,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalMedia / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Get media list error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get a single media item by ID
 */
exports.getMediaById = async (req, res) => {
  const userId = req.user.id;
  const { mediaId } = req.params;

  try {
    const media = await Media.findOne({
      _id: mediaId,
      $or: [
        { uploadedBy: userId },
        { isPublic: true }
      ]
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.status(200).json({
      media
    });
  } catch (error) {
    logger.error(`Get media by ID error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Update media metadata
 */
exports.updateMedia = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { mediaId } = req.params;
  const { peopleTagged, isPublic, metadata } = req.body;

  try {
    const media = await Media.findOne({
      _id: mediaId,
      uploadedBy: userId
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Update fields if provided
    if (peopleTagged) {
      media.peopleTagged = peopleTagged;
    }
    
    if (isPublic !== undefined) {
      media.isPublic = isPublic;
    }
    
    if (metadata) {
      media.metadata = {
        ...media.metadata,
        ...metadata
      };
    }

    await media.save();

    res.status(200).json({
      message: 'Media updated successfully',
      media
    });
  } catch (error) {
    logger.error(`Update media error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Delete media
 */
exports.deleteMedia = async (req, res) => {
  const userId = req.user.id;
  const { mediaId } = req.params;

  try {
    const media = await Media.findOne({
      _id: mediaId,
      uploadedBy: userId
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Delete all associated files from S3
    if (media.mediaType === 'image') {
      const keys = [
        media.key,
        media.metadata?.processedKeys?.thumbnail,
        media.metadata?.processedKeys?.small,
        media.metadata?.processedKeys?.medium,
        media.metadata?.processedKeys?.large
      ].filter(Boolean);
      
      await Promise.all(keys.map(key => s3Service.deleteFile(key)));
    } else if (media.mediaType === 'video') {
      const thumbnailKeys = media.metadata?.processedKeys?.thumbnails || [];
      const keys = [media.key, ...thumbnailKeys].filter(Boolean);
      
      await Promise.all(keys.map(key => s3Service.deleteFile(key)));
    }

    // Delete media record
    await Media.findByIdAndDelete(mediaId);

    res.status(200).json({
      message: 'Media deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete media error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Search media by various criteria
 */
exports.searchMedia = async (req, res) => {
  const userId = req.user.id;
  const { 
    query = '', 
    mediaType, 
    startDate, 
    endDate, 
    peopleTagged,
    page = 1,
    limit = 20
  } = req.query;

  try {
    // Build search query
    const searchQuery = {
      $or: [
        { uploadedBy: userId },
        { isPublic: true }
      ]
    };
    
    // Add text search if query provided
    if (query) {
      searchQuery.$text = { $search: query };
    }
    
    // Add filters
    if (mediaType) {
      searchQuery.mediaType = mediaType;
    }
    
    if (startDate || endDate) {
      searchQuery.createdAt = {};
      if (startDate) {
        searchQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        searchQuery.createdAt.$lte = new Date(endDate);
      }
    }
    
    if (peopleTagged) {
      searchQuery.peopleTagged = { $in: peopleTagged.split(',') };
    }

    // Execute search with pagination
    const totalResults = await Media.countDocuments(searchQuery);
    const results = await Media.find(searchQuery)
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      results,
      pagination: {
        total: totalResults,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalResults / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Search media error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get media by people tagged
 */
exports.getMediaByPeopleTagged = async (req, res) => {
  const userId = req.user.id;
  const { personId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    // Build query for media with specific person tagged
    const query = {
      peopleTagged: personId,
      $or: [
        { uploadedBy: userId },
        { isPublic: true }
      ]
    };

    // Execute query with pagination
    const totalMedia = await Media.countDocuments(query);
    const mediaItems = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      media: mediaItems,
      pagination: {
        total: totalMedia,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalMedia / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Get media by people tagged error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get media by date range
 */
exports.getMediaByDateRange = async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;
  const { page = 1, limit = 20 } = req.query;

  if (!startDate && !endDate) {
    return res.status(400).json({ error: 'At least one date parameter is required' });
  }

  try {
    // Build date range query
    const query = {
      $or: [
        { uploadedBy: userId },
        { isPublic: true }
      ],
      createdAt: {}
    };

    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }

    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const totalMedia = await Media.countDocuments(query);
    const mediaItems = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      media: mediaItems,
      pagination: {
        total: totalMedia,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalMedia / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Get media by date range error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get media statistics
 */
exports.getMediaStats = async (req, res) => {
  const userId = req.user.id;

  try {
    // Calculate various statistics
    const totalImages = await Media.countDocuments({ 
      uploadedBy: userId,
      mediaType: 'image' 
    });
    
    const totalVideos = await Media.countDocuments({ 
      uploadedBy: userId, 
      mediaType: 'video' 
    });
    
    const totalSize = await Media.aggregate([
      { $match: { uploadedBy: userId } },
      { $group: { _id: null, total: { $sum: '$size' } } }
    ]);

    const mediaByMonth = await Media.aggregate([
      { $match: { uploadedBy: userId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          size: { $sum: '$size' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    const topPeopleTagged = await Media.aggregate([
      { $match: { uploadedBy: userId } },
      { $unwind: '$peopleTagged' },
      { $group: { _id: '$peopleTagged', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      totalCount: totalImages + totalVideos,
      totalImages,
      totalVideos,
      totalSize: totalSize.length > 0 ? totalSize[0].total : 0,
      mediaByMonth,
      topPeopleTagged
    });
  } catch (error) {
    logger.error(`Get media stats error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};
