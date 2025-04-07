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
      {/* Add a wrapper View for internal padding */}
      <View style={styles.itemContent}>
        <Image source={imageSource} style={styles.image} />
      </View>

      {/* Selection checkmark */}
      {isSelectionMode && (
        <View style={[
          styles.selectionOverlay,
          isSelected && styles.selectedOverlay
        ]}>
          {isSelected && (
            <View style={styles.checkmarkContainer}>
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={18} color="white" />
              </View>
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
    backgroundColor: COLORS.LIGHT || '#F7F7F7', // Use a defined light color or fallback
  },
  itemContent: { // New style for internal padding
    flex: 1,
    padding: 2, // Small internal padding
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
    backgroundColor: 'rgba(43, 104, 230, 0.4)', // Slightly darker overlay
  },
  checkmarkContainer: { // Wrapper for potential border/shadow
    // Add styles here if needed, e.g., shadow
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.PRIMARY || '#2B68E6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5, // Add border for contrast
    borderColor: 'rgba(255, 255, 255, 0.7)', // White border
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
