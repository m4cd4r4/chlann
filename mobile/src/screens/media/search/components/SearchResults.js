import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../config/constants';

/**
 * SearchResults Component
 * 
 * A component that displays media search results in a grid layout.
 * Features:
 * - Responsive grid with automatic column count based on screen width
 * - Visual indicators for media type
 * - Optimized image loading
 * - Support for pagination
 */
const SearchResults = ({
  data = [],
  onItemPress,
  onEndReached,
  loading = false,
  loadingMore = false,
}) => {
  // Calculate optimal number of columns based on screen width
  const [numColumns, setNumColumns] = useState(3);
  const [itemWidth, setItemWidth] = useState(0);
  
  // Recalculate layout on screen dimension changes
  useEffect(() => {
    const calculateLayout = () => {
      const { width } = Dimensions.get('window');
      // Determine number of columns based on screen width
      let columns = 3; // Default for phones
      
      if (width >= 768) {
        columns = 4; // Tablet portrait
      }
      if (width >= 1024) {
        columns = 5; // Tablet landscape
      }
      
      // Calculate item size with a small gap between items
      const gap = 2;
      const calculatedWidth = (width - (columns + 1) * gap) / columns;
      
      setNumColumns(columns);
      setItemWidth(calculatedWidth);
    };
    
    calculateLayout();
    
    // Listen for dimension changes (e.g. rotation)
    const dimensionsSubscription = Dimensions.addEventListener('change', calculateLayout);
    
    return () => {
      // Clean up subscription
      dimensionsSubscription.remove();
    };
  }, []);
  
  // Render individual grid item
  const renderItem = ({ item }) => {
    // Handle different media types
    const isVideo = item.type === 'video';
    const isDocument = item.type === 'document';
    
    return (
      <TouchableOpacity
        style={[styles.itemContainer, { width: itemWidth, height: itemWidth }]}
        onPress={() => onItemPress(item)}
        activeOpacity={0.7}
      >
        {/* Media thumbnail */}
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        
        {/* Media type indicator */}
        {(isVideo || isDocument) && (
          <View style={styles.typeIndicator}>
            <Ionicons
              name={isVideo ? 'videocam' : 'document-text'}
              size={16}
              color="#FFFFFF"
            />
          </View>
        )}
        
        {/* Quality badge */}
        {item.quality && (
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityText}>{item.quality}</Text>
          </View>
        )}
        
        {/* Caption overlay (if exists) */}
        {item.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption} numberOfLines={2}>
              {item.caption}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  // Handle empty list state
  const renderEmptyList = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.emptyText}>Loading media...</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={48} color={COLORS.TEXT_SECONDARY} />
        <Text style={styles.emptyText}>No results found</Text>
      </View>
    );
  };
  
  // Render loading footer for pagination
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };
  
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      contentContainerStyle={styles.gridContainer}
      ListEmptyComponent={renderEmptyList}
      ListFooterComponent={renderFooter}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      initialNumToRender={numColumns * 3}
      maxToRenderPerBatch={numColumns * 3}
      windowSize={21}
    />
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    padding: 1,
    flexGrow: 1,
  },
  itemContainer: {
    margin: 1,
    overflow: 'hidden',
    borderRadius: 2,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.SURFACE || '#F7F7F7',
  },
  typeIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  qualityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 6,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.TEXT_SECONDARY || '#646464',
    fontSize: 16,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    marginLeft: 8,
    color: COLORS.TEXT_SECONDARY || '#646464',
    fontSize: 14,
  },
});

export default SearchResults;
