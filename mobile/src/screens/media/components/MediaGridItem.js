import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MediaQualityIndicator from './MediaQualityIndicator';
import { COLORS } from '../../../config/constants';

// Note: For development, create an image-placeholder.png in the assets folder
// This is a fallback for when thumbnailUrl is null
let imagePlaceholder;
try {
  imagePlaceholder = require('../../../assets/image-placeholder.png');
} catch (error) {
  // Placeholder image not found, will use background color instead
  console.warn('Placeholder image not found in assets folder');
}

const MediaGridItem = ({
  item,
  width,
  height,
  onPress,
  onLongPress,
  isSelected,
  isSelectionMode,
}) => {
  const { type, thumbnailUrl, quality } = item;
  
  // Handle null image source (for development/testing)
  const imageSource = thumbnailUrl 
    ? { uri: thumbnailUrl } 
    : imagePlaceholder ? imagePlaceholder : null;
  
  // Determine if item is a video
  const isVideo = type === 'video';
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width, height },
        isSelected && styles.selectedContainer,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Image source={imageSource} style={styles.image} />
      
      {/* Selection checkmark */}
      {isSelectionMode && (
        <View style={[
          styles.selectionOverlay,
          isSelected && styles.selectedOverlay
        ]}>
          {isSelected && (
            <View style={styles.checkmark}>
              <Ionicons name="checkmark" size={18} color="white" />
            </View>
          )}
        </View>
      )}
      
      {/* Quality indicator */}
      <MediaQualityIndicator quality={quality} />
      
      {/* Video play icon */}
      {isVideo && (
        <View style={styles.videoOverlay}>
          <View style={styles.playButton}>
            <Ionicons name="play" size={20} color="white" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: COLORS.PRIMARY || '#2B68E6',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOverlay: {
    backgroundColor: 'rgba(43, 104, 230, 0.3)',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.PRIMARY || '#2B68E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MediaGridItem;
