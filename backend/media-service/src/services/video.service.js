const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const s3Service = require('./s3.service');
const logger = require('../utils/logger');
const { getExtensionFromMimeType } = require('../utils/fileTypes');

// Video processing config
const VIDEO_QUALITY = process.env.VIDEO_QUALITY || 'high';
const THUMBNAIL_COUNT = parseInt(process.env.VIDEO_THUMBNAIL_COUNT || '3');
const THUMBNAIL_SIZE = parseInt(process.env.THUMBNAIL_SIZE || '300');
const MAX_WIDTH = parseInt(process.env.VIDEO_MAX_WIDTH || '1920');
const MAX_HEIGHT = parseInt(process.env.VIDEO_MAX_HEIGHT || '1080');

// Video quality presets
const qualityPresets = {
  low: {
    videoBitrate: '1000k',
    audioBitrate: '96k',
    resolution: '640x?'
  },
  medium: {
    videoBitrate: '2500k',
    audioBitrate: '128k',
    resolution: '1280x?'
  },
  high: {
    videoBitrate: '5000k',
    audioBitrate: '192k',
    resolution: '1920x?'
  }
};

/**
 * Process video and create optimized version with thumbnails
 * @param {string} inputVideo - Path to input video file
 * @param {string} userId - User ID
 * @param {string} mimeType - Video mime type
 * @param {string} originalFilename - Original filename
 * @returns {Promise<Object>} Object with URLs for processed video and thumbnails
 */
const processVideo = async (inputVideo, userId, mimeType, originalFilename) => {
  try {
    // Create temp directory
    const tempDir = path.join(os.tmpdir(), uuidv4());
    fs.mkdirSync(tempDir, { recursive: true });

    // Get video info
    const videoInfo = await getVideoInfo(inputVideo);
    const { width, height, duration, bitrate, codec } = videoInfo;

    // Determine file extension
    const extension = getExtensionFromMimeType(mimeType) || 'mp4';

    // Prepare output paths
    const results = {};
    const baseKey = s3Service.generateUniqueKey(userId, 'mp4', 'videos/');
    const baseKeyWithoutExt = baseKey.substring(0, baseKey.lastIndexOf('.'));

    // Process video
    const outputPath = path.join(tempDir, 'processed.mp4');
    const quality = qualityPresets[VIDEO_QUALITY] || qualityPresets.high;

    // Use ffmpeg to transcode video
    await new Promise((resolve, reject) => {
      let ffmpegCommand = ffmpeg(inputVideo)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-profile:v', 'high',
          '-crf', '22',
          '-c:a', 'aac',
          '-b:a', quality.audioBitrate,
          '-movflags', '+faststart'
        ]);

      // Apply resolution limit if needed
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        ffmpegCommand = ffmpegCommand.size(quality.resolution);
      }

      ffmpegCommand
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Error transcoding video: ${err.message}`)))
        .run();
    });

    // Generate thumbnails at different positions
    const thumbnailPaths = [];
    const thumbnailPromises = [];

    for (let i = 0; i < THUMBNAIL_COUNT; i++) {
      const position = (duration / (THUMBNAIL_COUNT + 1)) * (i + 1);
      const thumbnailPath = path.join(tempDir, `thumbnail_${i}.jpg`);
      thumbnailPaths.push(thumbnailPath);

      const thumbnailPromise = new Promise((resolve, reject) => {
        ffmpeg(inputVideo)
          .screenshots({
            timestamps: [position],
            filename: `thumbnail_${i}.jpg`,
            folder: tempDir,
            size: `${THUMBNAIL_SIZE}x?`
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(new Error(`Error generating thumbnail: ${err.message}`)));
      });

      thumbnailPromises.push(thumbnailPromise);
    }

    await Promise.all(thumbnailPromises);

    // Upload processed video and thumbnails to S3
    const videoKey = baseKey;
    const thumbnailResults = [];

    // Upload video
    const videoResult = await s3Service.uploadFile(fs.readFileSync(outputPath), videoKey, 'video/mp4', {
      userId,
      originalFilename,
      width: width.toString(),
      height: height.toString(),
      duration: duration.toString(),
      bitrate: bitrate.toString()
    });

    // Upload thumbnails
    for (let i = 0; i < thumbnailPaths.length; i++) {
      const thumbnailKey = `${baseKeyWithoutExt}_thumbnail_${i}.jpg`;
      const thumbnailResult = await s3Service.uploadFile(
        fs.readFileSync(thumbnailPaths[i]),
        thumbnailKey,
        'image/jpeg',
        {
          userId,
          originalFilename,
          type: 'thumbnail',
          position: ((duration / (THUMBNAIL_COUNT + 1)) * (i + 1)).toString()
        }
      );
      thumbnailResults.push({
        key: thumbnailKey,
        url: thumbnailResult.url,
        position: (duration / (THUMBNAIL_COUNT + 1)) * (i + 1)
      });
    }

    // Clean up temp files
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Return all URLs and metadata
    return {
      video: videoResult.url,
      thumbnails: thumbnailResults.map(t => t.url),
      primaryThumbnail: thumbnailResults[Math.floor(thumbnailResults.length / 2)].url,
      videoKey,
      thumbnailKeys: thumbnailResults.map(t => t.key),
      width,
      height,
      duration,
      bitrate,
      codec,
      mimeType: 'video/mp4',
      processedVersions: {
        video: videoResult,
        thumbnails: thumbnailResults
      }
    };
  } catch (error) {
    logger.error(`Video processing error: ${error.message}`);
    throw new Error(`Failed to process video: ${error.message}`);
  }
};

/**
 * Get video information using ffprobe
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Object>} Video metadata
 */
const getVideoInfo = async (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Failed to get video metadata: ${err.message}`));
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      
      if (!videoStream) {
        return reject(new Error('No video stream found'));
      }

      resolve({
        width: videoStream.width,
        height: videoStream.height,
        duration: parseFloat(metadata.format.duration || 0),
        bitrate: parseInt(metadata.format.bit_rate || 0),
        codec: videoStream.codec_name,
        frameRate: eval(videoStream.r_frame_rate || '0'),
        size: parseInt(metadata.format.size || 0)
      });
    });
  });
};

module.exports = {
  processVideo,
  getVideoInfo
};
