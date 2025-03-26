# Media Viewer Screen Enhancement Plan

## Overview

The Media Viewer Screen is a critical component of the ChlannClaude app, responsible for displaying high-resolution photos and videos with optimal quality and performance. This document outlines the implementation plan for enhancing the viewer to support the app's focus on high-resolution media.

## Core Features

1. **Progressive Image Loading**
   - Multi-stage loading: thumbnail → preview → high-res → original
   - Visual indication of loading progress
   - Background pre-fetching of higher resolutions

2. **Resolution Selector**
   - User control over quality level (SD/HD/4K/Original)
   - Quality indicator showing current resolution
   - Data usage estimates for each quality level

3. **Advanced Zoom & Pan**
   - Smooth, high-performance pinch-to-zoom
   - Maintaining image quality during zooming
   - Double-tap to zoom to specific regions

4. **Video Playback Controls**
   - Custom video player with quality control
   - Adaptive streaming based on connection speed
   - Picture-in-picture support

5. **Media Information Display**
   - Resolution and file size information
   - EXIF data display (date, camera model, etc.)
   - Location data with privacy controls

6. **Sharing & Export Options**
   - Options to share at different quality levels
   - Direct download of original files
   - Configurable compression for sharing

## Components Structure

```
screens/media/viewers/
├── MediaViewerScreen.js              # Main screen component
├── components/
│   ├── ProgressiveImage.js           # Image with progressive loading
│   ├── VideoPlayer.js                # Enhanced video player
│   ├── ImageZoomViewer.js            # Zoomable image component
│   ├── MediaControls.js              # Controls overlay (share, download, etc.)
│   ├── MediaInfo.js                  # Displays metadata
│   ├── ResolutionSelector.js         # Quality level picker
│   ├── LoadingIndicator.js           # Progressive loading UI
│   └── ViewerHeader.js               # Header with back button and options
├── hooks/
│   ├── useProgressiveLoading.js      # Custom hook for staged loading
│   ├── useMediaDownload.js           # Manages download of media
│   └── useMediaMetadata.js           # Extracts and formats metadata
└── utils/
    ├── mediaQualityUtils.js          # Quality determination helpers
    ├── gestureHandlers.js            # Pan/zoom gesture logic
    └── mediaCache.js                 # Caching logic for viewed media
```

## Implementation Phases

### Phase 1: Core Viewer Architecture (2 days)

1. **Create Base Components:**
   - MediaViewerScreen with basic image and video support
   - Simple, functional controls for navigation
   - Basic pinch-to-zoom functionality

2. **Implement Navigation:**
   - Proper routing from MediaGallery to MediaViewer
   - Smooth transitions between gallery and viewer
   - Swipe navigation between media items

### Phase 2: Progressive Loading System (2 days)

1. **Develop Progressive Image Component:**
   - Multi-stage loading from thumbnail to original
   - Background pre-loading of higher resolutions
   - Smooth transitions between quality levels

2. **Create Loading UI:**
   - Visual indicator of current loading stage
   - Progress indicators for each quality level
   - Estimated time remaining for high-res loads

### Phase 3: Advanced Media Controls (2 days)

1. **Resolution Control:**
   - Manual quality selection interface
   - Automatic quality based on connection
   - Memory usage and performance optimization

2. **Enhanced Zoom and Pan:**
   - High-performance gesture handling
   - Region-specific zooming
   - Edge bouncing and constraints

3. **Video Controls:**
   - Custom video player UI
   - Quality selector for videos
   - Playback speed and frame controls

### Phase 4: Media Information and Sharing (1 day)

1. **Metadata Display:**
   - Technical information panel
   - EXIF data extraction and display
   - Location data with privacy controls

2. **Sharing Options:**
   - Quality selection for sharing
   - Multiple share targets
   - Offline availability options

### Phase 5: Performance Optimization (1 day)

1. **Memory Management:**
   - Efficient unloading of resources
   - Caching strategy for frequently viewed media
   - Low-memory handling

2. **Animation Performance:**
   - Optimized rendering of transitions
   - Hardware acceleration where appropriate
   - Reduced jank during gestures

## Technical Specifications

### Progressive Loading Implementation

```javascript
// Pseudo-code for progressive loading
const loadImageProgressively = async (mediaId) => {
  // 1. First load and display thumbnail (fastest)
  const thumbnail = await loadMediaVariant(mediaId, 'thumbnail');
  setCurrentDisplay(thumbnail);
  
  // 2. Load preview quality in background
  const preview = await loadMediaVariant(mediaId, 'preview');
  if (currentQuality < QUALITY.PREVIEW) {
    setCurrentDisplay(preview);
  }
  
  // 3. Load high resolution if requested or by default
  if (autoLoadHighRes || userSelectedQuality >= QUALITY.HIGH) {
    const highRes = await loadMediaVariant(mediaId, 'high');
    if (currentQuality < QUALITY.HIGH) {
      setCurrentDisplay(highRes);
    }
  }
  
  // 4. Load original only if explicitly requested
  if (userSelectedQuality === QUALITY.ORIGINAL) {
    const original = await loadMediaVariant(mediaId, 'original');
    setCurrentDisplay(original);
  }
};
```

### Media Quality Selection

The app will support these quality levels:

- **Thumbnail**: ~200px width (10-30KB)
- **Preview**: ~1080px width (100-200KB)
- **High**: Full device resolution (1-3MB)
- **Original**: Native resolution (5-20MB)

Selection will be based on:
- User preference
- Network conditions (WiFi vs. Cellular)
- Device capabilities
- Memory availability

### Caching Strategy

- **Short-term cache**: Recently viewed media at preview quality
- **Medium-term cache**: Frequently viewed media (based on access patterns)
- **Long-term cache**: Explicitly saved items at high quality
- **Cache clearing**: Automatic based on storage pressure or manual in settings

## User Experience Flows

### 1. Basic Viewing Flow

1. User taps a media item in the gallery
2. Thumbnail immediately displayed with loading indicator
3. Preview quality loads quickly and replaces thumbnail
4. Resolution indicator shows current quality
5. User can manually request higher quality if desired

### 2. Zooming Flow

1. User pinches to zoom into image
2. If current quality is insufficient for zoom level:
   a. Loading indicator appears
   b. Higher quality version is loaded
   c. Display updates once higher quality is available
3. User can pan around the zoomed image
4. Double-tap to zoom to specific region or reset zoom

### 3. Quality Selection Flow

1. User taps resolution indicator
2. Quality selection menu appears
3. Each option shows estimated data usage
4. User selects desired quality
5. Loading begins for selected quality
6. Display updates once loading completes

## APIs Required

1. **Media Service Endpoints:**
   - `GET /api/media/:mediaId` - Basic metadata
   - `GET /api/media/:mediaId/:variant` - Specific quality variant
   - `GET /api/media/:mediaId/metadata` - Technical metadata

2. **Client-Side Storage:**
   - AsyncStorage for preferences
   - FileSystem for caching
   - SecureStore for sensitive metadata

## Testing Strategy

1. **Performance Testing:**
   - Measure frame rates during animations
   - Memory usage during extended viewing sessions
   - Loading times for different network conditions

2. **Device Testing:**
   - Various screen sizes and resolutions
   - Range of device capabilities
   - iOS and Android platform differences

3. **Network Testing:**
   - Poor connectivity scenarios
   - Interrupted downloads
   - Reconnection handling

## Success Criteria

The enhanced Media Viewer will be considered successful when:

1. Users can comfortably view photos at original resolution
2. Zoom and pan are smooth even for very large images
3. Video playback is stable with quality control
4. Loading times are perceived as fast regardless of actual file size
5. Memory usage remains reasonable during extended viewing sessions
6. UI remains responsive throughout all operations
