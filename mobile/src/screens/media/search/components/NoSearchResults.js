import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../config/constants';

/**
 * NoSearchResults Component
 * 
 * A component that displays a friendly message when no search results are found.
 * It provides context-aware messaging based on the search query and active filters.
 */
const NoSearchResults = ({
  searchQuery,
  hasFilters,
  onClearFilters,
}) => {
  // Determine the appropriate message based on search context
  const getMessage = () => {
    if (searchQuery && hasFilters) {
      return `No results found for "${searchQuery}" with the current filters.`;
    } else if (searchQuery) {
      return `No results found for "${searchQuery}".`;
    } else if (hasFilters) {
      return "No media matches the selected filters.";
    } else {
      return "No media found.";
    }
  };
  
  // Determine suggestions based on search context
  const getSuggestion = () => {
    if (hasFilters) {
      return "Try changing or removing filters.";
    } else if (searchQuery) {
      return "Try using different search terms.";
    } else {
      return "Try uploading some media first.";
    }
  };
  
  return (
    <View style={styles.container}>
      <Ionicons
        name="search-outline"
        size={64}
        color={COLORS.TEXT_SECONDARY || '#646464'}
      />
      
      <Text style={styles.message}>{getMessage()}</Text>
      <Text style={styles.suggestion}>{getSuggestion()}</Text>
      
      {hasFilters && (
        <TouchableOpacity
          style={styles.button}
          onPress={onClearFilters}
        >
          <Text style={styles.buttonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
      
      {!searchQuery && !hasFilters && (
        <View style={styles.emptyStateContent}>
          <View style={styles.emptyStateItem}>
            <Ionicons
              name="cloud-upload-outline"
              size={28}
              color={COLORS.TEXT_SECONDARY || '#646464'}
            />
            <Text style={styles.emptyStateText}>
              Upload photos and videos to get started
            </Text>
          </View>
          
          <View style={styles.emptyStateItem}>
            <Ionicons
              name="folder-outline"
              size={28}
              color={COLORS.TEXT_SECONDARY || '#646464'}
            />
            <Text style={styles.emptyStateText}>
              Create albums to organize your media
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  message: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.TEXT || '#121212',
    textAlign: 'center',
    marginTop: 16,
  },
  suggestion: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY || '#646464',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.PRIMARY || '#2B68E6',
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.WHITE || '#FFFFFF',
  },
  emptyStateContent: {
    width: '100%',
    marginTop: 40,
  },
  emptyStateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE || '#F7F7F7',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.TEXT || '#121212',
    marginLeft: 12,
    flex: 1,
  },
});

export default NoSearchResults;
