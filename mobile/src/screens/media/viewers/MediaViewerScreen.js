import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Dimensions,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../../config/constants';

// Import components
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'; // Import Video component and types
import Slider from '@react-native-community/slider'; // Import Slider
import ProgressiveImage from './components/ProgressiveImage';
import ImageZoomViewer from './components/ImageZoomViewer';
import ResolutionSelector from './components/ResolutionSelector';
import MediaInfo from './components/MediaInfo';
import MediaService from '../../../services/mediaService'; // Import MediaService

// Quality levels (map to backend version keys)
const QUALITY = {
  THUMBNAIL: 'thumbnail',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  ORIGINAL: 'original',
  PROCESSED_VIDEO: 'processed_video', // For video
};

// Quality level labels (adjust as needed)
const QUALITY_LABELS = {
  [QUALITY.THUMBNAIL]: 'Thumb',
  [QUALITY.SMALL]: 'SD',
  [QUALITY.MEDIUM]: 'HD',
  [QUALITY.LARGE]: 'FHD',
  [QUALITY.ORIGINAL]: 'Original',
  [QUALITY.PROCESSED_VIDEO]: 'Video',
};

const MediaViewerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mediaId } = route.params || {};

  // State
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  // Default quality based on type (e.g., medium for image, processed for video)
  const [currentQuality, setCurrentQuality] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  // Video playback state
  const [playbackStatus, setPlaybackStatus] = useState < AVPlaybackStatus | null > (null);

  // Refs
  const autoHideTimer = useRef(null);
  const videoRef = useRef < Video | null > (null); // Ref for video component

  // Load media on mount
  useEffect(() => {
    const loadMedia = async () => {
      setLoading(true);
      
      try {
        const mediaData = await MediaService.getMediaById(mediaId);
        setMedia(mediaData);
        // Set initial quality based on type
        setCurrentQuality(mediaData.mediaType === 'video' ? QUALITY.PROCESSED_VIDEO : QUALITY.MEDIUM);
      } catch (error) {
        console.error('Error loading media:', error);
        Alert.alert('Error', 'Failed to load media.');
      } finally {
        setLoading(false);
      }
    };
    
    if (mediaId) {
      loadMedia();
    }
    
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, [mediaId]);
  
  // Auto-hide controls after inactivity
  useEffect(() => {
    if (showControls) {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
      
      autoHideTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, [showControls]);
  
  // Handle media tap to toggle controls
  const handleMediaTap = () => {
    setShowControls(!showControls);
  };
  
  // Handle quality change
  const handleQualityChange = (quality) => {
    setCurrentQuality(quality);
    // In a real app, this would trigger loading of the appropriate quality
  };
  
  // Handle share
  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out this media from ChlannClaude!',
        url: media.previewUrl, // In a real app, use the appropriate URL
      });
    } catch (error) {
      console.error('Error sharing media:', error);
    }
  };
  
  // Handle download
  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      // In a real app, this would download the file
      // await FileSystem.downloadAsync(media.originalUrl, FileSystem.documentDirectory + 'media.jpg');
      
      setTimeout(() => {
        setIsDownloading(false);
        Alert.alert('Success', 'Media downloaded successfully.');
      }, 2000);
    } catch (error) {
      console.error('Error downloading media:', error);
      setIsDownloading(false);
      Alert.alert('Error', 'Failed to download media.');
    }
  };
  
  // Get current media URL based on quality
  const getCurrentMediaUrl = () => {
    if (!media || !currentQuality || !media.versions || !media.versions[currentQuality]) {
      // Fallback or return null/placeholder
      return media?.versions?.medium?.url || media?.versions?.thumbnail?.url || null;
    }
    return media.versions[currentQuality].url;
  };

  // Format time helper
  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Get current quality label
  const getCurrentQualityLabel = () => {
    return QUALITY_LABELS[currentQuality] || 'Unknown';
  };

  // Get current quality size (if available in version data)
  const getCurrentQualitySize = () => {
    if (!media || !currentQuality || !media.versions || !media.versions[currentQuality]?.size) {
      return '';
    }
    // Format size (e.g., from bytes to KB/MB)
    const sizeInBytes = media.versions[currentQuality].size;
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Render header
  const renderHeader = () => {
    if (!showControls) return null;
    
    return (
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowInfo(!showInfo)}
          >
            <Ionicons name="information-circle-outline" size={28} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={28} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="download-outline" size={28} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Render footer
  const renderFooter = () => {
    if (!showControls) return null;
    
    return (
      <View style={styles.footer}>
        {/* Only show quality selector for images */}
        {media?.mediaType === 'image' && (
          <TouchableOpacity
            style={styles.qualitySelector}
            onPress={() => setShowQualityModal(true)} // Open the modal
          >
            <Text style={styles.qualityText}>{getCurrentQualityLabel()}</Text>
            <Text style={styles.qualitySizeText}>{getCurrentQualitySize()}</Text>
          </TouchableOpacity>
        )}

        {media?.mediaType === 'video' && (
          <View style={styles.videoControls}>
            <TouchableOpacity
              style={styles.videoControlButton}
              onPress={() => {
                if (playbackStatus?.isLoaded) {
                  playbackStatus.isPlaying ? videoRef.current?.pauseAsync() : videoRef.current?.playAsync();
                }
              }}
            >
              <Ionicons name={playbackStatus?.isPlaying ? "pause" : "play"} size={24} color="white" />
            </TouchableOpacity>

            <Text style={styles.videoTime}>{formatTime(playbackStatus?.positionMillis)}</Text>

            <Slider
              style={styles.videoProgressSlider}
              minimumValue={0}
              maximumValue={playbackStatus?.durationMillis || 1}
              value={playbackStatus?.positionMillis || 0}
              minimumTrackTintColor={COLORS.PRIMARY}
              maximumTrackTintColor="rgba(255, 255, 255, 0.5)"
              thumbTintColor={COLORS.PRIMARY}
              onSlidingComplete={async (value) => {
                 if (videoRef.current) {
                   await videoRef.current.setPositionAsync(value);
                   if (!playbackStatus?.isPlaying) { // Resume playing if paused before sliding
                     // await videoRef.current.playAsync(); // Optional: auto-play after seek
                   }
                 }
              }}
              // onSlidingStart={() => videoRef.current?.pauseAsync()} // Optional: pause while sliding
            />

            <Text style={styles.videoTime}>{formatTime(playbackStatus?.durationMillis)}</Text>
          </View>
        )}
      </View>
    );
  };
  
  // Quality selection modal
  const [showQualityModal, setShowQualityModal] = useState(false);
  
  // Handle zoom (adjust quality logic if needed)
  const handleZoomStart = (scale) => {
    setShowControls(false);
  };

  const handleZoomChange = (scale) => {
    // Example: Load higher quality if zoomed significantly
    if (media?.mediaType === 'image' && scale > 2 && currentQuality !== QUALITY.LARGE && currentQuality !== QUALITY.ORIGINAL) {
       if (media.versions[QUALITY.LARGE]) {
         setCurrentQuality(QUALITY.LARGE);
       } else if (media.versions[QUALITY.ORIGINAL]) {
         setCurrentQuality(QUALITY.ORIGINAL);
       }
    }
  };

  const handleZoomEnd = (scale) => {
    setShowControls(true); // Show controls briefly after zoom
  };
  
  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.mediaContainer}
          onPress={handleMediaTap}
        >
          {media?.mediaType === 'video' ? ( // Check mediaType
            <Video
              ref={videoRef}
              style={styles.media}
              source={{ uri: getCurrentMediaUrl() }} // Use processed video URL
              // useNativeControls // Remove native controls
              resizeMode={ResizeMode.CONTAIN} // Use ResizeMode enum
              onPlaybackStatusUpdate={setPlaybackStatus} // Update state on status change
            />
          ) : (
            // Image viewer with zoom capabilities
            <ImageZoomViewer
              // Use thumbnail from versions if available
              thumbnailSource={{ uri: media?.versions?.thumbnail?.url }}
              source={{ uri: getCurrentMediaUrl() }} // Use dynamic URL based on quality
              style={styles.media}
              onZoomStart={handleZoomStart}
              onZoomChange={handleZoomChange}
              onZoomEnd={handleZoomEnd}
              maxScale={5}
              minScale={1}
              doubleTapScale={3}
            />
          )}
          
          {/* TODO: Add loading indicator logic based on image loading state */}
          {/* {isLoadingHigherQuality && ( ... )} */}
        </TouchableOpacity>
      )}
      
      {renderHeader()}
      {renderFooter()}
      
      {/* Media info display */}
      {showInfo && (
        <MediaInfo 
          media={media} 
          onClose={() => setShowInfo(false)} 
        />
      )}
      
      {/* Quality selector modal - Pass available versions */}
      {media?.mediaType === 'image' && (
        <ResolutionSelector
          availableQualities={Object.keys(media.versions || {}).filter(q => q !== 'processed_video')} // Pass available quality keys
          currentQuality={currentQuality}
          onQualityChange={(qualityKey) => {
            setCurrentQuality(qualityKey); // Set quality based on key ('thumbnail', 'small', etc.)
            setShowQualityModal(false);
          }}
          showModal={showQualityModal}
          onToggleModal={() => setShowQualityModal(!showQualityModal)}
          estimatedDataUsage={getCurrentQualitySize()} // Pass formatted size
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    resizeMode: 'contain',
  },
  mediaPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeholderSubtext: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerRight: {
    flexDirection: 'row',
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  // Update the quality selector to use our component
  qualitySelector: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'column',
    alignItems: 'center',
  },
  qualityText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  qualitySizeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingVertical: 8, // Adjusted padding
    paddingHorizontal: 10,
  },
  videoControlButton: {
    padding: 8, // Increased touch area
  },
  videoProgressSlider: {
    flex: 1, // Take available space
    height: 40, // Make slider easier to grab
    marginHorizontal: 8,
  },
  videoTime: {
    color: 'white',
    fontSize: 12,
    minWidth: 40, // Ensure space for time
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginRight: 10,
    fontSize: 14,
  },
});

export default MediaViewerScreen;
