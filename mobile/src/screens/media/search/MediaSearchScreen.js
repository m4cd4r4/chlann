import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../../config/constants';

// Import components and hooks
import SearchBar from './components/SearchBar';
import SearchFilters from './components/SearchFilters';
import SearchResults from './components/SearchResults';
import NoSearchResults from './components/NoSearchResults';
import useMediaSearch from './hooks/useMediaSearch';

/**
 * MediaSearchScreen Component
 * 
 * The main screen for searching media in the gallery.
 * Provides search input, filters, and displays results.
 * Uses the useMediaSearch hook for search logic.
 */
const MediaSearchScreen = () => {
  const navigation = useNavigation();
  const [showFilters, setShowFilters] = useState(false);
  
  // Use the media search hook for search functionality
  const {
    query: searchQuery,
    filters: activeFilters,
    results,
    loading,
    loadingMore,
    searchHistory,
    handleQueryChange: setSearchQuery,
    handleFiltersChange: handleFilterChange,
    loadMore,
    clearSearch: handleClearSearch,
    selectHistoryItem: handleHistorySelect,
  } = useMediaSearch('', {
    types: [],
    dateRange: { start: null, end: null },
    quality: null,
  });
  
  // Toggle filters visibility
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };
  
  // Handle item selection
  const handleItemSelect = (item) => {
    navigation.navigate('MediaViewer', { mediaId: item.id });
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Search bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={handleClearSearch}
          onFilterToggle={toggleFilters}
          searchHistory={searchHistory}
          onHistorySelect={handleHistorySelect}
        />
        
        {/* Filters */}
        {showFilters && (
          <SearchFilters
            filters={activeFilters}
            onChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        )}
        
        {/* Results or loading indicator */}
        {results.length > 0 ? (
          <SearchResults
            data={results}
            onItemPress={handleItemSelect}
            onEndReached={loadMore}
            loading={loading}
            loadingMore={loadingMore}
          />
        ) : (
          <NoSearchResults
            searchQuery={searchQuery}
            hasFilters={activeFilters.types.length > 0 || 
                       activeFilters.dateRange.start || 
                       activeFilters.dateRange.end || 
                       activeFilters.quality}
            onClearFilters={handleClearSearch}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND || '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.TEXT_SECONDARY || '#646464',
    fontSize: 16,
  },
});

export default MediaSearchScreen;
