import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Platform, // Import Platform
  Alert, // Import Alert for feedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker'; // Import ImagePicker
import { COLORS } from '../../config/constants';
import MediaService from '../../services/mediaService'; // Import MediaService

// Import components
import MediaGrid from './components/MediaGrid';
import MediaFilterBar from './components/MediaFilterBar';
import DateNavigator from './components/DateNavigator';
import EmptyStateView from './components/EmptyStateView';
import UploadProgressIndicator from './components/UploadProgressIndicator'; // Import progress indicator

const MediaGalleryScreen = () => {
  const navigation = useNavigation(); // Use hook for navigation

  // Local state for media data, loading, pagination, and filters
  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // For initial load indicator
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(30); // Items per page
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'image', 'video'
  // Add state for date range if DateNavigator is used

  // Local state for UI interactions
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({}); // State for upload progress { tempId: percentage }

  // Fetch media function
  const fetchMediaData = useCallback(async (currentPage = 1, isRefreshing = false) => {
    if (isLoading || (!hasMore && !isRefreshing)) return; // Prevent multiple fetches

    setIsLoading(true);
    if (isRefreshing) setRefreshing(true);
    if (currentPage === 1) setIsInitialLoading(true); // Show initial loader only on first page load

    try {
      const filterType = activeFilter === 'all' ? null : activeFilter;
      const response = await MediaService.getMediaList(currentPage, limit, null, filterType); // Pass filterType

      setMedia(prevMedia => currentPage === 1 ? response.media : [...prevMedia, ...response.media]);
      setTotal(response.pagination.total);
      setPage(currentPage);
      setHasMore(response.media.length === limit && (currentPage * limit) < response.pagination.total);

    } catch (error) {
      console.error('Failed to fetch media:', error);
      // Handle error display
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setIsInitialLoading(false);
    }
  }, [isLoading, hasMore, limit, activeFilter]); // Dependencies for fetchMediaData

  // Fetch initial media on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchMediaData(1, true); // Fetch first page on focus, treat as refresh
      return () => {
        // Optional cleanup
      };
    }, [fetchMediaData]) // Re-run if fetchMediaData changes (due to filter change)
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchMediaData(1, true); // Fetch page 1 and set refreshing state
  }, [fetchMediaData]);

  // Handle loading more items
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchMediaData(page + 1);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    // Reset state and fetch with new filter
    setMedia([]);
    setPage(1);
    setTotal(0);
    setHasMore(true);
    // fetchMediaData will be called by useFocusEffect due to dependency change
  };
  
  // Handle month change (Placeholder - requires DateNavigator integration)
  const handleMonthChange = (month) => {
    console.log(`Month changed to: ${month}`);
    // Implement date range filtering and refetching here
    setShowCalendar(false);
  };

  // Handle item selection
  const handleItemSelect = (item) => {
    if (isSelectionMode) {
      const itemIndex = selectedItems.findIndex(i => i._id === item._id); // Use _id
      if (itemIndex > -1) {
        setSelectedItems(prevItems => prevItems.filter(i => i._id !== item._id));
      } else {
        setSelectedItems(prevItems => [...prevItems, item]);
      }
    } else {
      // Navigate to media viewer using _id
      navigation.navigate('MediaViewer', { mediaId: item._id });
    }
  };

  // Handle item long press
  const handleItemLongPress = (item) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedItems([item]);
    }
  };
  
  // Handle cancel selection
  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedItems([]);
  };

  // Selection actions (Placeholders - Implement actual logic)
  const handleShare = () => {
    console.log(`Sharing ${selectedItems.length} items`);
    // TODO: Implement sharing logic
    handleCancelSelection();
  };

  const handleSave = () => {
    console.log(`Saving ${selectedItems.length} items`);
    // TODO: Implement saving logic (downloading media)
    handleCancelSelection();
  };

  const handleDelete = async () => {
    console.log(`Deleting ${selectedItems.length} items`);
    // TODO: Add confirmation dialog
    const idsToDelete = selectedItems.map(item => item._id);
    try {
      // Call delete service for each item (or batch if API supports)
      await Promise.all(idsToDelete.map(id => MediaService.deleteMedia(id)));
      // Refresh the list after deletion
      handleRefresh();
    } catch (error) {
      console.error('Failed to delete media:', error);
      // Show error message
    } finally {
      handleCancelSelection();
    }
  };

  // Handle initiating the upload process
  const handleUpload = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant access to your photo library to upload media.');
      return;
    }

    // Launch image picker
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow images and videos
        allowsMultipleSelection: true, // Allow selecting multiple items
        quality: 0.8, // Adjust quality for uploads (0 to 1)
      });

      if (!result.canceled && result.assets) {
        // Start upload process for each selected asset
        result.assets.forEach(asset => {
          uploadAsset(asset);
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  // Function to upload a single asset
  const uploadAsset = async (asset) => {
    const tempId = asset.assetId || `${Date.now()}-${Math.random()}`; // Generate a temporary ID
    setUploadProgress(prev => ({ ...prev, [tempId]: 0 })); // Show progress starting at 0%

    try {
      // Use the refactored service function
      await MediaService.uploadMedia(
        asset,
        (percent) => { // Progress callback
          setUploadProgress(prev => ({ ...prev, [tempId]: percent }));
        }
        // Pass conversationId or messageId here if needed
      );

      // Success: Remove progress indicator and refresh
      setUploadProgress(prev => {
        const newState = { ...prev };
        delete newState[tempId]; // Remove progress on completion
        return newState;
      });
      Alert.alert('Success', `${asset.fileName || 'Media'} uploaded successfully!`);
      handleRefresh(); // Refresh the gallery

    } catch (error) {
      console.error(`Failed to upload asset ${tempId}:`, error);
      Alert.alert('Upload Failed', `Could not upload ${asset.fileName || 'media'}. Please try again.`);
      setUploadProgress(prev => {
        const newState = { ...prev };
        delete newState[tempId]; // Remove progress on error
        return newState;
      });
    }
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      {isSelectionMode ? (
        <>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancelSelection}
          >
            <Ionicons name="close" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Selected ({selectedItems.length})</Text>
          {/* Use a view with same width as right container for balance */}
          <View style={styles.headerRightPlaceholder} />
        </>
      ) : (
        <>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Media Gallery</Text>
          <View style={styles.headerRightContainer}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('MediaSearch')}>
              <Ionicons name="search" size={24} color={COLORS.TEXT} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => console.log('More options...')}>
              <Ionicons name="ellipsis-vertical" size={24} color={COLORS.TEXT} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
  
  // Render selection toolbar
  const renderSelectionToolbar = () => {
    if (!isSelectionMode) return null;
    
    return (
      <View style={styles.selectionToolbar}>
        <TouchableOpacity style={styles.selectionAction} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={COLORS.TEXT} />
          <Text style={styles.selectionActionText}>Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.selectionAction} onPress={handleSave}>
          <Ionicons name="download-outline" size={22} color={COLORS.TEXT} />
          <Text style={styles.selectionActionText}>Save</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.selectionAction} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={COLORS.DANGER} />
          <Text style={[styles.selectionActionText, { color: COLORS.DANGER }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {renderHeader()}
      
      {!isSelectionMode && (
        <>
          <MediaFilterBar
            activeFilter={activeFilter} // Pass current filter state
            onFilterChange={handleFilterChange}
          />

          {/* Date Navigator - Requires state and logic for date range filtering */}
          {/* <DateNavigator
            currentMonth={currentMonth} // Needs state management
            showCalendar={showCalendar}
            onToggleCalendar={() => setShowCalendar(!showCalendar)}
            onMonthChange={handleMonthChange}
          /> */}
        </>
      )}

      {isInitialLoading && !refreshing ? ( // Show loader only on initial load
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      ) : media.length === 0 ? ( // Use fetched media length
        <EmptyStateView activeFilter={activeFilter} />
      ) : (
        <MediaGrid
          data={media} // Use fetched media data
          numColumns={3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.PRIMARY]}
            />
          }
          onEndReached={handleLoadMore} // Add handler for loading more
          onEndReachedThreshold={0.5} // Adjust threshold as needed
          ListFooterComponent={isLoading && !isInitialLoading ? <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginVertical: 20 }} /> : null} // Loading indicator at bottom
          onItemPress={handleItemSelect}
          onItemLongPress={handleItemLongPress}
          selectedItems={selectedItems} // Pass selected items state
          isSelectionMode={isSelectionMode}
        />
      )}
      
      {renderSelectionToolbar()}

      {/* Upload FAB - only show when not in selection mode */}
      {!isSelectionMode && (
        <TouchableOpacity style={styles.fab} onPress={handleUpload}>
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}

      {/* Display overall upload progress */}
      <UploadProgressIndicator progressData={uploadProgress} />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND || '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER || '#E5E5E5',
    backgroundColor: COLORS.BACKGROUND || '#FFFFFF', // Ensure header background
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT || '#121212',
    textAlign: 'center', // Center title
    flex: 1, // Allow title to take available space
  },
  backButton: {
    padding: 4,
    minWidth: 40, // Ensure minimum touch area and balance
    alignItems: 'flex-start', // Align icon left
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // Align buttons right
    minWidth: 80, // Match placeholder width or adjust as needed
  },
  headerRightPlaceholder: { // Placeholder for balance in selection mode
    minWidth: 80, // Should match headerRightContainer width
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER || '#E5E5E5',
    paddingVertical: 10, // Slightly adjust padding
    paddingBottom: Platform.OS === 'ios' ? 20 : 10, // Add bottom padding for safe area on iOS
    backgroundColor: COLORS.LIGHT || '#F7F7F7', // Slightly different background
    // Add subtle shadow/elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 3,
  },
  selectionAction: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  selectionActionText: {
    fontSize: 12,
    marginTop: 4,
    color: COLORS.TEXT || '#121212',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: COLORS.PRIMARY,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    // Add shadow/elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default MediaGalleryScreen;
