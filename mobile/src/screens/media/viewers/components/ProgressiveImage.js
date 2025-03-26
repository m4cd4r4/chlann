import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Animated,
  ActivityIndicator,
  Text,
} from 'react-native';
import { COLORS } from '../../../../config/constants';

/**
 * ProgressiveImage Component
 * 
 * A component that loads images progressively, starting with a lower resolution
 * placeholder and then loading the higher resolution image. This creates a smooth
 * experience when viewing high-resolution images.
 * 
 * Features:
 * - Shows placeholder/thumbnail while loading high-resolution image
 * - Smooth fade transition between resolutions
 * - Loading indicator for high-resolution images
 * - Supports various image resizing modes
 */
const ProgressiveImage = ({
  thumbnailSource,
  source,
  style,
  resizeMode = 'contain',
  onLoadStart,
  onLoadEnd,
  onError,
  showLoadingIndicator = true,
  ...props
}) => {
  // Animation value for fading between images
  const [thumbnailOpacity] = useState(new Animated.Value(0));
  const [imageOpacity] = useState(new Animated.Value(0));
  
  // Loading states
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Handle thumbnail load
  const handleThumbnailLoad = () => {
    setThumbnailLoaded(true);
    
    Animated.timing(thumbnailOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };
  
  // Handle main image load start
  const handleImageLoadStart = () => {
    if (onLoadStart) {
      onLoadStart();
    }
  };
  
  // Handle main image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    if (onLoadEnd) {
      onLoadEnd();
    }
  };
  
  // Handle image error
  const handleImageError = (error) => {
    setImageError(true);
    
    if (onError) {
      onError(error);
    }
  };
  
  return (
    <View style={[styles.container, style]}>
      {/* Thumbnail image (loads first) */}
      {thumbnailSource && (
        <Animated.Image
          source={thumbnailSource}
          style={[
            styles.image,
            { opacity: thumbnailOpacity },
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
          ]}
          onLoad={handleThumbnailLoad}
          blurRadius={2}
          resizeMode={resizeMode}
        />
      )}
      
      {/* Main high-resolution image */}
      {source && (
        <Animated.Image
          source={source}
          style={[
            styles.image,
            { opacity: imageOpacity },
          ]}
          onLoadStart={handleImageLoadStart}
          onLoad={handleImageLoad}
          onError={handleImageError}
          resizeMode={resizeMode}
          {...props}
        />
      )}
      
      {/* Loading indicator */}
      {showLoadingIndicator && !imageLoaded && !imageError && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
        </View>
      )}
      
      {/* Error state */}
      {imageError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load image</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ProgressiveImage;
