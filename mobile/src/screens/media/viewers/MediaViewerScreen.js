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
import ProgressiveImage from './components/ProgressiveImage';
import ImageZoomViewer from './components/ImageZoomViewer';
import ResolutionSelector from './components/ResolutionSelector';
import MediaInfo from './components/MediaInfo';

// Quality levels
const QUALITY = {
  THUMBNAIL: 0,
  PREVIEW: 1,
  HIGH: 2,
  ORIGINAL: 3,
};

// Quality level labels
const QUALITY_LABELS = {
  [QUALITY.THUMBNAIL]: 'SD',
  [QUALITY.PREVIEW]: 'HD',
  [QUALITY.HIGH]: '4K',
  [QUALITY.ORIGINAL]: 'RAW',
};

// Temporary mocked media data
const getMockMediaData = (mediaId) => {
  return {
    id: mediaId,
    type: 'image', // or 'video'
    width: 4032,
    height: 3024,
    createdAt: new Date().toISOString(),
    thumbnailUrl: 'https://via.placeholder.com/300',
    previewUrl: 'https://via.placeholder.com/1080',
    highResUrl: 'https://via.placeholder.com/3000',
    originalUrl: 'https://via.placeholder.com/4032',
    size: {
      thumbnail: '30KB',
      preview: '200KB',
      high: '2.5MB',
      original: '8.2MB',
    },
    metadata: {
      camera: 'iPhone 13 Pro',
      iso: '100',
      aperture: 'f/1.8',
      exposureTime: '1/120s',
      location: 'Perth, Australia',
    },
  };
};

const MediaViewerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mediaId } = route.params || {};
  
  // State
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuality, setCurrentQuality] = useState(QUALITY.PREVIEW);
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Timer references for controls auto-hide
  const autoHideTimer = useRef(null);
  
  // Load media on mount
  useEffect(() => {
    const loadMedia = async () => {
      setLoading(true);
      
      try {
        // In a real app, this would be an API call
        // const mediaData = await api.getMedia(mediaId);
        const mediaData = getMockMediaData(mediaId);
        
        setMedia(mediaData);
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
    if (!media) return null;
    
    switch (currentQuality) {
      case QUALITY.THUMBNAIL:
        return media.thumbnailUrl;
      case QUALITY.PREVIEW:
        return media.previewUrl;
      case QUALITY.HIGH:
        return media.highResUrl;
      case QUALITY.ORIGINAL:
        return media.originalUrl;
      default:
        return media.previewUrl;
    }
  };
  
  // Get current quality label
  const getCurrentQualityLabel = () => {
    return QUALITY_LABELS[currentQuality] || 'HD';
  };
  
  // Get current quality size
  const getCurrentQualitySize = () => {
    if (!media) return '';
    
    switch (currentQuality) {
      case QUALITY.THUMBNAIL:
        return media.size.thumbnail;
      case QUALITY.PREVIEW:
        return media.size.preview;
      case QUALITY.HIGH:
        return media.size.high;
      case QUALITY.ORIGINAL:
        return media.size.original;
      default:
        return media.size.preview;
    }
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
        <TouchableOpacity
          style={styles.qualitySelector}
          onPress={() => {
            // For demonstration, cycle through quality levels
            setCurrentQuality((prev) => (prev + 1) % 4);
          }}
        >
          <Text style={styles.qualityText}>{getCurrentQualityLabel()}</Text>
          <Text style={styles.qualitySizeText}>{getCurrentQualitySize()}</Text>
        </TouchableOpacity>
        
        {media && media.type === 'video' && (
          <View style={styles.videoControls}>
            <TouchableOpacity style={styles.videoControlButton}>
              <Ionicons name="play" size={24} color="white" />
            </TouchableOpacity>
            
            <View style={styles.videoProgress}>
              <View style={styles.videoProgressBar} />
            </View>
            
            <Text style={styles.videoDuration}>0:00 / 1:30</Text>
          </View>
        )}
      </View>
    );
  };
  
  // Quality selection modal
  const [showQualityModal, setShowQualityModal] = useState(false);
  
  // Handle zoom
  const handleZoomStart = (scale) => {
    // Hide controls when zooming
    setShowControls(false);
  };
  
  const handleZoomChange = (scale) => {
    // Automatically load higher quality when zoomed in
    if (scale > 2 && currentQuality < QUALITY.HIGH) {
      setCurrentQuality(QUALITY.HIGH);
    }
  };
  
  const handleZoomEnd = (scale) => {
    // Show controls briefly when zoom ends
    setShowControls(true);
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
          {media?.type === 'video' ? (
            // Video player would go here when implemented
            <View style={[styles.mediaPlaceholder, styles.media]}>
              <Text style={styles.placeholderText}>Video Player</Text>
              <Text style={styles.placeholderSubtext}>
                Displaying at {getCurrentQualityLabel()} quality
              </Text>
              <Text style={styles.placeholderSubtext}>
                Resolution: {media?.width} × {media?.height}
              </Text>
            </View>
          ) : (
            // Image viewer with zoom capabilities
            <ImageZoomViewer
              thumbnailSource={{ uri: media?.thumbnailUrl }}
              source={{ uri: getCurrentMediaUrl() }}
              style={styles.media}
              onZoomStart={handleZoomStart}
              onZoomChange={handleZoomChange}
              onZoomEnd={handleZoomEnd}
              maxScale={5}
              minScale={1}
              doubleTapScale={3}
            />
          )}
          
          {/* Display quality loading indicator */}
          {currentQuality > QUALITY.PREVIEW && !imageLoaded && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>
                Loading {getCurrentQualityLabel()} quality...
              </Text>
              <ActivityIndicator size="small" color="white" />
            </View>
          )}
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
      
      {/* Quality selector modal */}
      <ResolutionSelector
        currentQuality={currentQuality === QUALITY.THUMBNAIL ? 'thumbnail' : 
                       currentQuality === QUALITY.PREVIEW ? 'preview' : 
                       currentQuality === QUALITY.HIGH ? 'high' : 'original'}
        onQualityChange={(quality) => {
          // Map quality string to enum
          const qualityMap = {
            'thumbnail': QUALITY.THUMBNAIL,
            'preview': QUALITY.PREVIEW,
            'high': QUALITY.HIGH,
            'original': QUALITY.ORIGINAL,
          };
          setCurrentQuality(qualityMap[quality] || QUALITY.PREVIEW);
        }}
        showModal={showQualityModal}
        onToggleModal={() => setShowQualityModal(!showQualityModal)}
        estimatedDataUsage={getCurrentQualitySize()}
      />
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
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  videoControlButton: {
    padding: 5,
  },
  videoProgress: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    width: 120,
    marginHorizontal: 10,
  },
  videoProgressBar: {
    height: '100%',
    width: '30%',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 2,
  },
  videoDuration: {
    color: 'white',
    fontSize: 12,
    marginLeft: 5,
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
