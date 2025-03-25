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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../config/constants';

// Import components
import MediaGrid from './components/MediaGrid';
import MediaFilterBar from './components/MediaFilterBar';
import DateNavigator from './components/DateNavigator';
import EmptyStateView from './components/EmptyStateView';

// Actions to be implemented in the future
// import { fetchMedia, setMediaFilter, setDateRange } from '../../redux/slices/mediaSlice';

const MediaGalleryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Redux state
  // These will be connected once we implement the mediaSlice
  const media = []; // This will come from redux store
  const isLoading = false; // This will come from redux store
  const activeFilter = 'all'; // This will come from redux store
  const currentMonth = new Date(); // This will come from redux store
  
  // Mock data for initial display
  const mockMedia = Array.from({ length: 24 }, (_, i) => ({
    id: `media-${i}`,
    type: i % 7 === 0 ? 'video' : 'image',
    thumbnailUrl: null, // In a real app, this would be a URL
    quality: i % 5 === 0 ? 'HD' : i % 8 === 0 ? '4K' : i % 10 === 0 ? 'RAW' : 'SD',
    width: 1080,
    height: 1920,
    createdAt: new Date(2025, 2, Math.floor(Math.random() * 30) + 1).toISOString(),
    uploaderId: `user-${Math.floor(Math.random() * 5) + 1}`,
    conversationId: `conversation-${Math.floor(Math.random() * 3) + 1}`,
  }));
  
  // Fetch media on screen focus
  useFocusEffect(
    useCallback(() => {
      // We'll replace this with real data fetching in the future
      console.log('Fetching media...');
      // dispatch(fetchMedia());
      
      return () => {
        // Cleanup if needed
      };
    }, [dispatch])
  );
  
  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // We'll replace this with real data fetching in the future
    setTimeout(() => {
      console.log('Refreshing media...');
      // dispatch(fetchMedia()).then(() => {
      //   setRefreshing(false);
      // });
      setRefreshing(false);
    }, 1500);
  }, []);
  
  // Handle filter change
  const handleFilterChange = (filter) => {
    console.log(`Filter changed to: ${filter}`);
    // dispatch(setMediaFilter(filter));
  };
  
  // Handle month change
  const handleMonthChange = (month) => {
    console.log(`Month changed to: ${month}`);
    // dispatch(setDateRange({ month }));
    setShowCalendar(false);
  };
  
  // Handle item selection
  const handleItemSelect = (item) => {
    if (isSelectionMode) {
      const itemIndex = selectedItems.findIndex(i => i.id === item.id);
      if (itemIndex > -1) {
        setSelectedItems(prevItems => prevItems.filter(i => i.id !== item.id));
      } else {
        setSelectedItems(prevItems => [...prevItems, item]);
      }
    } else {
      // Navigate to media viewer
      navigation.navigate('MediaViewer', { mediaId: item.id });
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
  
  // Selection actions
  const handleShare = () => {
    console.log(`Sharing ${selectedItems.length} items`);
    // Implementation will come later
    setIsSelectionMode(false);
    setSelectedItems([]);
  };
  
  const handleSave = () => {
    console.log(`Saving ${selectedItems.length} items`);
    // Implementation will come later
    setIsSelectionMode(false);
    setSelectedItems([]);
  };
  
  const handleDelete = () => {
    console.log(`Deleting ${selectedItems.length} items`);
    // Implementation will come later
    setIsSelectionMode(false);
    setSelectedItems([]);
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
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="checkmark" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
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
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Search')}>
              <Ionicons name="search" size={24} color={COLORS.TEXT} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
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
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
          />
          
          <DateNavigator
            currentMonth={currentMonth}
            showCalendar={showCalendar}
            onToggleCalendar={() => setShowCalendar(!showCalendar)}
            onMonthChange={handleMonthChange}
          />
        </>
      )}
      
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      ) : mockMedia.length === 0 ? (
        <EmptyStateView activeFilter={activeFilter} />
      ) : (
        <MediaGrid
          data={mockMedia}
          numColumns={3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.PRIMARY]}
            />
          }
          onItemPress={handleItemSelect}
          onItemLongPress={handleItemLongPress}
          selectedItems={selectedItems}
          isSelectionMode={isSelectionMode}
        />
      )}
      
      {renderSelectionToolbar()}
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT || '#121212',
  },
  backButton: {
    padding: 4,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingVertical: 12,
    backgroundColor: COLORS.BACKGROUND || '#FFFFFF',
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
});

export default MediaGalleryScreen;
