# Media Processing Implementation Plan

## Overview

A complete media processing pipeline optimized for self-hosting with 20 users, focusing on high-resolution media while maintaining performance.

## System Architecture

```
Mobile App → API Server → Media Processing Service → MinIO Storage
                                     ↓
                         MongoDB (media metadata)
```

## Implementation Components

### 1. Media Upload Service

**Server-Side Implementation:**

```javascript
// media-service.js
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const minio = require('minio');
const router = express.Router();

// Initialize MinIO client
const minioClient = new minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: './uploads/temp',
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Handle media upload
router.post('/upload', upload.single('media'), async (req, res) => {
  try {
    const { file } = req;
    const { conversationId, messageId } = req.body;
    const mediaId = uuidv4();
    const userId = req.user.id;
    
    // Determine media type
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return res.status(400).json({ error: 'Unsupported media type' });
    }
    
    // Create metadata record in MongoDB
    const mediaDoc = await MediaModel.create({
      _id: mediaId,
      messageId,
      uploaderId: userId,
      conversationId,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      mediaType: isImage ? 'image' : 'video',
      processingStatus: 'processing',
      createdAt: new Date()
    });
    
    // Queue processing job
    mediaQueue.add('process-media', {
      mediaId,
      filePath: file.path,
      mimeType: file.mimetype,
      userId,
      conversationId,
      messageId
    });
    
    return res.status(202).json({
      mediaId,
      status: 'processing'
    });
    
  } catch (error) {
    console.error('Media upload error:', error);
    return res.status(500).json({ error: 'Failed to process media' });
  }
});

module.exports = router;
```

### 2. Media Processing Queue Worker

```javascript
// media-processor.js
const Queue = require('bull');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Initialize queue
const mediaQueue = new Queue('media-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// Process media queue
mediaQueue.process('process-media', async (job) => {
  const { mediaId, filePath, mimeType, userId, conversationId, messageId } = job.data;
  
  try {
    // Update status
    await MediaModel.findByIdAndUpdate(mediaId, { processingStatus: 'processing' });
    
    // Create paths for processed versions
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    
    const outputDir = path.join('./uploads/processed', mediaId);
    await fs.ensureDir(outputDir);
    
    const variants = [];
    
    if (isImage) {
      // Process image variants
      variants = await processImage(filePath, outputDir, mediaId);
    } else if (isVideo) {
      // Process video variants
      variants = await processVideo(filePath, outputDir, mediaId);
    }
    
    // Upload to MinIO
    const uploadedVariants = await uploadToStorage(variants, mediaId);
    
    // Update database with processed info
    await MediaModel.findByIdAndUpdate(mediaId, {
      processingStatus: 'completed',
      variants: uploadedVariants,
      thumbnailUrl: uploadedVariants.find(v => v.type === 'thumbnail')?.url,
      previewUrl: uploadedVariants.find(v => v.type === 'preview')?.url,
      highResUrl: uploadedVariants.find(v => v.type === 'high')?.url,
      completedAt: new Date()
    });
    
    // Clean up temp files
    await fs.remove(filePath);
    await fs.remove(outputDir);
    
    // Notify clients about completed processing
    io.to(`conversation:${conversationId}`).emit('media:processed', { 
      mediaId, 
      messageId,
      status: 'completed',
      variants: uploadedVariants
    });
    
    return { mediaId, status: 'completed' };
    
  } catch (error) {
    console.error('Media processing error:', error);
    
    // Update status to failed
    await MediaModel.findByIdAndUpdate(mediaId, { 
      processingStatus: 'failed',
      error: error.message
    });
    
    // Notify about failure
    io.to(`conversation:${conversationId}`).emit('media:processed', { 
      mediaId, 
      messageId,
      status: 'failed'
    });
    
    throw error;
  }
});

// Image processing function
async function processImage(filePath, outputDir, mediaId) {
  const image = sharp(filePath);
  const metadata = await image.metadata();
  
  const variants = [
    // Thumbnail (for message bubbles and gallery)
    {
      type: 'thumbnail',
      path: path.join(outputDir, `${mediaId}-thumb.jpg`),
      width: 300,
      height: null,
      format: 'jpeg',
      quality: 80
    },
    // Preview (for faster loading before high-res)
    {
      type: 'preview',
      path: path.join(outputDir, `${mediaId}-preview.jpg`),
      width: 1080,
      height: null,
      format: 'jpeg',
      quality: 85
    },
    // High resolution
    {
      type: 'high',
      path: path.join(outputDir, `${mediaId}-high.${metadata.format}`),
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      quality: 95
    }
  ];
  
  // Process each variant
  for (const variant of variants) {
    let processor = image.clone();
    
    if (variant.width && variant.height) {
      processor = processor.resize(variant.width, variant.height, { fit: 'inside' });
    } else if (variant.width) {
      processor = processor.resize(variant.width, null, { fit: 'inside' });
    }
    
    if (variant.format === 'jpeg' || variant.format === 'jpg') {
      processor = processor.jpeg({ quality: variant.quality });
    } else if (variant.format === 'png') {
      processor = processor.png({ quality: variant.quality });
    } else if (variant.format === 'webp') {
      processor = processor.webp({ quality: variant.quality });
    }
    
    await processor.toFile(variant.path);
  }
  
  return variants;
}

// Video processing function
async function processVideo(filePath, outputDir, mediaId) {
  // Create thumbnail from video
  const thumbnailPath = path.join(outputDir, `${mediaId}-thumb.jpg`);
  await new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .screenshots({
        count: 1,
        folder: outputDir,
        filename: `${mediaId}-thumb.jpg`,
        size: '300x?'
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  // Create preview (lower resolution)
  const previewPath = path.join(outputDir, `${mediaId}-preview.mp4`);
  await new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .output(previewPath)
      .videoCodec('libx264')
      .size('720x?')
      .videoBitrate('1000k')
      .audioCodec('aac')
      .audioBitrate('128k')
      .on('end', resolve)
      .on('error', reject);
  });
  
  // Create high-resolution version (maintain quality but optimize codec)
  const highResPath = path.join(outputDir, `${mediaId}-high.mp4`);
  await new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .output(highResPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .videoBitrate('4000k')
      .audioBitrate('192k')
      .on('end', resolve)
      .on('error', reject);
  });
  
  return [
    {
      type: 'thumbnail',
      path: thumbnailPath,
      format: 'jpeg'
    },
    {
      type: 'preview',
      path: previewPath,
      format: 'mp4'
    },
    {
      type: 'high',
      path: highResPath,
      format: 'mp4'
    }
  ];
}

// Upload processed files to MinIO
async function uploadToStorage(variants, mediaId) {
  const bucket = 'media';
  
  // Ensure bucket exists
  const bucketExists = await minioClient.bucketExists(bucket);
  if (!bucketExists) {
    await minioClient.makeBucket(bucket);
  }
  
  const uploadedVariants = [];
  
  for (const variant of variants) {
    const objectName = `${mediaId}/${variant.type}.${variant.format}`;
    
    await minioClient.fPutObject(
      bucket,
      objectName,
      variant.path,
      { 'Content-Type': getMimeType(variant.format) }
    );
    
    uploadedVariants.push({
      type: variant.type,
      url: `/api/media/${mediaId}/${variant.type}`,
      format: variant.format,
      width: variant.width,
      height: variant.height
    });
  }
  
  return uploadedVariants;
}

// Helper to get MIME type from format
function getMimeType(format) {
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'webm': 'video/webm'
  };
  
  return mimeTypes[format] || 'application/octet-stream';
}

module.exports = mediaQueue;
```

### 3. Media Serving Controller

```javascript
// media-controller.js
const express = require('express');
const router = express.Router();

// Get media metadata
router.get('/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const media = await MediaModel.findById(mediaId);
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Check access permissions
    const hasAccess = await checkMediaAccess(req.user.id, media.conversationId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    return res.json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Serve media file
router.get('/:mediaId/:variant', async (req, res) => {
  try {
    const { mediaId, variant } = req.params;
    const media = await MediaModel.findById(mediaId);
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Check access permissions
    const hasAccess = await checkMediaAccess(req.user.id, media.conversationId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const variantInfo = media.variants.find(v => v.type === variant);
    if (!variantInfo) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    
    // Stream from MinIO
    const bucket = 'media';
    const objectName = `${mediaId}/${variant}.${variantInfo.format}`;
    
    const stream = await minioClient.getObject(bucket, objectName);
    
    // Set appropriate headers
    res.setHeader('Content-Type', getMimeType(variantInfo.format));
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // Pipe the stream to response
    stream.pipe(res);
    
  } catch (error) {
    console.error('Error serving media:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to check if a user has access to a media file
async function checkMediaAccess(userId, conversationId) {
  const conversation = await ConversationModel.findById(conversationId);
  return conversation && conversation.participantIds.includes(userId);
}

module.exports = router;
```

## Client-Side Implementation

### 1. Media Upload Component

```javascript
// MediaUploader.js (React Native)
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ProgressBar, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useDispatch } from 'react-redux';
import { sendMediaMessage } from '../redux/actions/messagesActions';

const MediaUploader = ({ conversationId }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const dispatch = useDispatch();
  
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1, // Keep original quality
    });
    
    if (!result.cancelled) {
      uploadMedia(result.uri);
    }
  };
  
  const uploadMedia = async (uri) => {
    try {
      setUploading(true);
      setProgress(0);
      
      // Create form data
      const formData = new FormData();
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      // Check file size (max 100MB)
      if (fileInfo.size > 100 * 1024 * 1024) {
        Alert.alert('File too large', 'Please select a file smaller than 100MB');
        setUploading(false);
        return;
      }
      
      // Determine file type and name
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      formData.append('media', {
        uri,
        name: `media.${fileType}`,
        type: `${uri.includes('image') ? 'image' : 'video'}/${fileType}`
      });
      
      formData.append('conversationId', conversationId);
      
      // Create upload callback
      const uploadCallback = (progress) => {
        setProgress(progress.loaded / progress.total);
      };
      
      // Dispatch upload action
      const result = await dispatch(sendMediaMessage(formData, uploadCallback));
      
      setUploading(false);
      setProgress(0);
      
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload failed', 'Failed to upload media. Please try again.');
      setUploading(false);
    }
  };
  
  return (
    <View>
      <TouchableOpacity 
        onPress={pickImage}
        disabled={uploading}
        style={styles.button}
      >
        <Text>{uploading ? 'Uploading...' : 'Add Media'}</Text>
      </TouchableOpacity>
      
      {uploading && <ProgressBar progress={progress} />}
    </View>
  );
};

export default MediaUploader;
```

### 2. Media Viewing Component

```javascript
// MediaViewer.js (React Native)
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import ImageZoom from 'react-native-image-pan-zoom';
import FastImage from 'react-native-fast-image';
import Video from 'react-native-video';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMediaDetails } from '../redux/actions/mediaActions';

const { width, height } = Dimensions.get('window');

const MediaViewer = ({ route }) => {
  const { mediaId } = route.params;
  const [loading, setLoading] = useState(true);
  const [loadingHighRes, setLoadingHighRes] = useState(false);
  
  const dispatch = useDispatch();
  const mediaDetails = useSelector(state => state.media.mediaItems[mediaId]);
  
  useEffect(() => {
    const loadMedia = async () => {
      setLoading(true);
      await dispatch(fetchMediaDetails(mediaId));
      setLoading(false);
    };
    
    loadMedia();
  }, [mediaId, dispatch]);
  
  if (loading || !mediaDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  const isImage = mediaDetails.mediaType === 'image';
  const previewUrl = mediaDetails.variants.find(v => v.type === 'preview')?.url;
  const highResUrl = mediaDetails.variants.find(v => v.type === 'high')?.url;
  
  if (isImage) {
    return (
      <View style={styles.container}>
        <ImageZoom
          cropWidth={width}
          cropHeight={height}
          imageWidth={width}
          imageHeight={height}
        >
          <FastImage
            style={styles.image}
            source={{ 
              uri: loadingHighRes ? previewUrl : highResUrl,
              priority: FastImage.priority.high,
            }}
            resizeMode={FastImage.resizeMode.contain}
            onLoadStart={() => setLoadingHighRes(true)}
            onLoadEnd={() => setLoadingHighRes(false)}
          />
        </ImageZoom>
        
        {loadingHighRes && (
          <View style={styles.highResLoading}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        )}
      </View>
    );
  } else {
    // Video viewer
    return (
      <View style={styles.container}>
        <Video
          source={{ uri: highResUrl }}
          style={styles.video}
          controls={true}
          resizeMode="contain"
          onLoadStart={() => setLoadingHighRes(true)}
          onLoad={() => setLoadingHighRes(false)}
        />
        
        {loadingHighRes && (
          <View style={styles.highResLoading}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        )}
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  image: {
    width: width,
    height: height,
  },
  video: {
    width: width,
    height: height,
  },
  highResLoading: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 10,
  },
});

export default MediaViewer;
```

## Storage Optimization

For a self-hosted solution with 20 users, implement these storage optimizations:

1. **Storage Retention Policies:**
   - Implement time-based retention for high-resolution media (keep for 30 days, then require explicit "save" to prevent deletion)
   - Keep thumbnails and previews indefinitely
   - Allow users to download and archive their own media

2. **Storage Monitoring:**
   - Create admin dashboard to monitor storage usage
   - Set up alerts when storage exceeds thresholds
   - Implement user quotas if needed

3. **Backup System:**
   - Set up nightly incremental backups of MinIO data
   - Create weekly full backups
   - Store backups on separate storage
