const { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin'
  }
});

const bucketName = process.env.S3_BUCKET_NAME || 'chlann-claude-media';

/**
 * Upload a file to S3 storage
 * @param {Buffer} fileData - File data as Buffer
 * @param {string} key - File key in S3
 * @param {string} contentType - File content type
 * @param {Object} metadata - Optional metadata
 * @returns {Promise<Object>} Upload details
 */
const uploadFile = async (fileData, key, contentType, metadata = {}) => {
  try {
    const metadataObj = {};
    Object.keys(metadata).forEach(k => {
      metadataObj[k] = metadata[k].toString();
    });

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: fileData,
      ContentType: contentType,
      Metadata: metadataObj
    };

    const command = new PutObjectCommand(params);
    const result = await s3Client.send(command);

    return {
      key,
      bucket: bucketName,
      eTag: result.ETag,
      url: `${process.env.S3_PUBLIC_URL || 'http://localhost:9000'}/${bucketName}/${key}`
    };
  } catch (error) {
    logger.error(`S3 upload error: ${error.message}`);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Generate a pre-signed URL for direct uploads
 * @param {string} key - File key in S3
 * @param {string} contentType - File content type
 * @param {number} expiresIn - Expiration time in seconds (default: 900 = 15 minutes)
 * @returns {Promise<string>} Pre-signed URL
 */
const getPresignedUploadUrl = async (key, contentType, expiresIn = 900) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
      ContentType: contentType
    };

    const command = new PutObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    return {
      url,
      key,
      bucket: bucketName,
      expiresIn
    };
  } catch (error) {
    logger.error(`Pre-signed URL generation error: ${error.message}`);
    throw new Error(`Failed to generate pre-signed URL: ${error.message}`);
  }
};

/**
 * Get a pre-signed URL for accessing a file
 * @param {string} key - File key in S3
 * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} Pre-signed URL
 */
const getPresignedGetUrl = async (key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key
    };

    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    return url;
  } catch (error) {
    logger.error(`Pre-signed Get URL generation error: ${error.message}`);
    throw new Error(`Failed to generate pre-signed Get URL: ${error.message}`);
  }
};

/**
 * Copy a file within S3
 * @param {string} sourceKey - Source file key
 * @param {string} destinationKey - Destination file key
 * @returns {Promise<Object>} Copy details
 */
const copyFile = async (sourceKey, destinationKey) => {
  try {
    const params = {
      Bucket: bucketName,
      CopySource: `/${bucketName}/${sourceKey}`,
      Key: destinationKey
    };

    const command = new CopyObjectCommand(params);
    const result = await s3Client.send(command);

    return {
      sourceKey,
      destinationKey,
      bucket: bucketName,
      eTag: result.CopyObjectResult.ETag,
      url: `${process.env.S3_PUBLIC_URL || 'http://localhost:9000'}/${bucketName}/${destinationKey}`
    };
  } catch (error) {
    logger.error(`S3 copy error: ${error.message}`);
    throw new Error(`Failed to copy file: ${error.message}`);
  }
};

/**
 * Delete a file from S3
 * @param {string} key - File key in S3
 * @returns {Promise<Object>} Deletion details
 */
const deleteFile = async (key) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);

    return {
      key,
      bucket: bucketName,
      deleted: true
    };
  } catch (error) {
    logger.error(`S3 delete error: ${error.message}`);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Get file metadata from S3
 * @param {string} key - File key in S3
 * @returns {Promise<Object>} File metadata
 */
const getFileMetadata = async (key) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key
    };

    const command = new HeadObjectCommand(params);
    const result = await s3Client.send(command);

    return {
      key,
      bucket: bucketName,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      lastModified: result.LastModified,
      eTag: result.ETag,
      metadata: result.Metadata
    };
  } catch (error) {
    logger.error(`S3 metadata error: ${error.message}`);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
};

/**
 * List files in a directory
 * @param {string} prefix - Directory prefix
 * @param {number} maxKeys - Maximum number of keys to return
 * @returns {Promise<Array>} List of files
 */
const listFiles = async (prefix = '', maxKeys = 1000) => {
  try {
    const params = {
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys
    };

    const command = new ListObjectsV2Command(params);
    const result = await s3Client.send(command);

    return {
      files: result.Contents || [],
      isTruncated: result.IsTruncated,
      nextContinuationToken: result.NextContinuationToken
    };
  } catch (error) {
    logger.error(`S3 list error: ${error.message}`);
    throw new Error(`Failed to list files: ${error.message}`);
  }
};

/**
 * Generate a unique key for S3 storage
 * @param {string} userId - User ID
 * @param {string} extension - File extension
 * @param {string} prefix - Optional directory prefix
 * @returns {string} Unique S3 key
 */
const generateUniqueKey = (userId, extension, prefix = '') => {
  const uuid = uuidv4();
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${prefix}${userId}/${year}/${month}/${day}/${uuid}.${extension}`;
};

module.exports = {
  uploadFile,
  getPresignedUploadUrl,
  getPresignedGetUrl,
  copyFile,
  deleteFile,
  getFileMetadata,
  listFiles,
  generateUniqueKey,
  bucketName
};
