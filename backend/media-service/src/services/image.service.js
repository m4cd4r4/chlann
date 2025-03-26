const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const s3Service = require('./s3.service');
const logger = require('../utils/logger');
const { getExtensionFromMimeType } = require('../utils/fileTypes');

// Image processing config
const IMAGE_QUALITY = parseInt(process.env.IMAGE_QUALITY || '90');
const THUMBNAIL_SIZE = parseInt(process.env.THUMBNAIL_SIZE || '300');
const SMALL_SIZE = parseInt(process.env.SMALL_SIZE || '800');
const MEDIUM_SIZE = parseInt(process.env.MEDIUM_SIZE || '1200');
const LARGE_SIZE = parseInt(process.env.LARGE_SIZE || '2000');
const ORIGINAL_MAX_SIZE = parseInt(process.env.ORIGINAL_MAX_SIZE || '4000');

/**
 * Process image and create multiple resized versions
 * @param {Buffer|string} inputImage - Image buffer or path to file
 * @param {string} userId - User ID
 * @param {string} mimeType - Image mime type
 * @param {string} originalFilename - Original filename
 * @returns {Promise<Object>} Object with URLs for different sizes
 */
const processImage = async (inputImage, userId, mimeType, originalFilename) => {
  try {
    // Create temp directory
    const tempDir = path.join(os.tmpdir(), uuidv4());
    fs.mkdirSync(tempDir, { recursive: true });

    // Load the image
    let image;
    if (typeof inputImage === 'string') {
      // If input is a file path
      image = sharp(inputImage);
    } else {
      // If input is a buffer
      image = sharp(inputImage);
    }

    // Get image metadata
    const metadata = await image.metadata();
    const { width, height, format } = metadata;

    // Determine file extension
    const extension = getExtensionFromMimeType(mimeType) || format || 'jpg';

    // Prepare output paths
    const results = {};
    const baseKey = s3Service.generateUniqueKey(userId, extension, 'images/');
    const baseKeyWithoutExt = baseKey.substring(0, baseKey.lastIndexOf('.'));

    // Process original (with optional size limit)
    let originalImage = image;
    if (width > ORIGINAL_MAX_SIZE || height > ORIGINAL_MAX_SIZE) {
      originalImage = image.clone().resize({
        width: width > height ? ORIGINAL_MAX_SIZE : null,
        height: height > width ? ORIGINAL_MAX_SIZE : null,
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Create temporary files
    const originalPath = path.join(tempDir, `original.${extension}`);
    const thumbnailPath = path.join(tempDir, `thumbnail.${extension}`);
    const smallPath = path.join(tempDir, `small.${extension}`);
    const mediumPath = path.join(tempDir, `medium.${extension}`);
    const largePath = path.join(tempDir, `large.${extension}`);

    // Process and save original
    if (format === 'jpeg' || format === 'jpg' || mimeType === 'image/jpeg') {
      await originalImage.jpeg({ quality: IMAGE_QUALITY }).toFile(originalPath);
    } else if (format === 'png' || mimeType === 'image/png') {
      await originalImage.png({ quality: IMAGE_QUALITY }).toFile(originalPath);
    } else if (format === 'webp' || mimeType === 'image/webp') {
      await originalImage.webp({ quality: IMAGE_QUALITY }).toFile(originalPath);
    } else {
      // Default to JPEG for other formats
      await originalImage.jpeg({ quality: IMAGE_QUALITY }).toFile(originalPath);
    }

    // Create and save thumbnail
    await image
      .clone()
      .resize({
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        fit: 'cover'
      })
      .jpeg({ quality: IMAGE_QUALITY })
      .toFile(thumbnailPath);

    // Create and save small version
    await image
      .clone()
      .resize({
        width: SMALL_SIZE,
        height: SMALL_SIZE,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: IMAGE_QUALITY })
      .toFile(smallPath);

    // Create and save medium version
    await image
      .clone()
      .resize({
        width: MEDIUM_SIZE,
        height: MEDIUM_SIZE,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: IMAGE_QUALITY })
      .toFile(mediumPath);

    // Create and save large version
    await image
      .clone()
      .resize({
        width: LARGE_SIZE,
        height: LARGE_SIZE,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: IMAGE_QUALITY })
      .toFile(largePath);

    // Upload all versions to S3
    const originalKey = baseKey;
    const thumbnailKey = `${baseKeyWithoutExt}_thumbnail.jpg`;
    const smallKey = `${baseKeyWithoutExt}_small.jpg`;
    const mediumKey = `${baseKeyWithoutExt}_medium.jpg`;
    const largeKey = `${baseKeyWithoutExt}_large.jpg`;

    const [originalResult, thumbnailResult, smallResult, mediumResult, largeResult] = await Promise.all([
      s3Service.uploadFile(fs.readFileSync(originalPath), originalKey, mimeType, {
        userId,
        originalFilename,
        width: width.toString(),
        height: height.toString()
      }),
      s3Service.uploadFile(fs.readFileSync(thumbnailPath), thumbnailKey, 'image/jpeg', {
        userId,
        originalFilename,
        width: Math.min(width, THUMBNAIL_SIZE).toString(),
        height: Math.min(height, THUMBNAIL_SIZE).toString(),
        type: 'thumbnail'
      }),
      s3Service.uploadFile(fs.readFileSync(smallPath), smallKey, 'image/jpeg', {
        userId,
        originalFilename,
        width: Math.min(width, SMALL_SIZE).toString(),
        height: Math.min(height, SMALL_SIZE).toString(),
        type: 'small'
      }),
      s3Service.uploadFile(fs.readFileSync(mediumPath), mediumKey, 'image/jpeg', {
        userId,
        originalFilename,
        width: Math.min(width, MEDIUM_SIZE).toString(),
        height: Math.min(height, MEDIUM_SIZE).toString(),
        type: 'medium'
      }),
      s3Service.uploadFile(fs.readFileSync(largePath), largeKey, 'image/jpeg', {
        userId,
        originalFilename,
        width: Math.min(width, LARGE_SIZE).toString(),
        height: Math.min(height, LARGE_SIZE).toString(),
        type: 'large'
      })
    ]);

    // Clean up temp files
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Return all URLs and metadata
    return {
      original: originalResult.url,
      thumbnail: thumbnailResult.url,
      small: smallResult.url,
      medium: mediumResult.url,
      large: largeResult.url,
      originalKey,
      thumbnailKey,
      smallKey,
      mediumKey,
      largeKey,
      width,
      height,
      format: format || extension,
      mimeType,
      processedVersions: {
        original: originalResult,
        thumbnail: thumbnailResult,
        small: smallResult,
        medium: mediumResult,
        large: largeResult
      }
    };
  } catch (error) {
    logger.error(`Image processing error: ${error.message}`);
    throw new Error(`Failed to process image: ${error.message}`);
  }
};

module.exports = {
  processImage
};
