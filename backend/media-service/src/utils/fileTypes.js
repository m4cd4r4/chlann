/**
 * Allowed file types and their validations
 */
const allowedImageTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif'
];

const allowedVideoTypes = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/ogg'
];

const imageExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif'
};

const videoExtensions = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/x-matroska': 'mkv',
  'video/webm': 'webm',
  'video/ogg': 'ogv'
};

/**
 * Check if the file is an allowed image type
 * @param {string} mimeType - Mime type of the file
 * @returns {boolean} True if allowed, false otherwise
 */
const isAllowedImage = (mimeType) => {
  return allowedImageTypes.includes(mimeType);
};

/**
 * Check if the file is an allowed video type
 * @param {string} mimeType - Mime type of the file
 * @returns {boolean} True if allowed, false otherwise
 */
const isAllowedVideo = (mimeType) => {
  return allowedVideoTypes.includes(mimeType);
};

/**
 * Get file extension from mime type
 * @param {string} mimeType - Mime type of the file
 * @returns {string} File extension
 */
const getExtensionFromMimeType = (mimeType) => {
  if (isAllowedImage(mimeType)) {
    return imageExtensions[mimeType];
  }
  if (isAllowedVideo(mimeType)) {
    return videoExtensions[mimeType];
  }
  return 'bin'; // Default to binary file
};

/**
 * Get media type from mime type
 * @param {string} mimeType - Mime type of the file
 * @returns {string} Media type (image or video)
 */
const getMediaTypeFromMimeType = (mimeType) => {
  if (isAllowedImage(mimeType)) {
    return 'image';
  }
  if (isAllowedVideo(mimeType)) {
    return 'video';
  }
  return null;
};

module.exports = {
  allowedImageTypes,
  allowedVideoTypes,
  isAllowedImage,
  isAllowedVideo,
  getExtensionFromMimeType,
  getMediaTypeFromMimeType
};
