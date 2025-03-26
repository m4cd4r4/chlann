import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  Modal,
  FlatList,
  Text,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../config/constants';

/**
 * SearchBar Component
 * 
 * A customized search input component with enhanced features:
 * - Clean, prominent search input
 * - Voice search capability
 * - Recent searches
 * - Filter toggle
 */
const SearchBar = ({
  value,
  onChangeText,
  onClear,
  onSubmit,
  onFilterToggle,
  placeholder = 'Search media...',
  searchHistory = [],
  onHistorySelect,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);
  
  // Animation values
  const focusAnimation = useRef(new Animated.Value(0)).current;
  
  // Handle focus animation
  const handleFocus = () => {
    setIsFocused(true);
    setShowHistory(searchHistory.length > 0);
    
    Animated.timing(focusAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };
  
  // Handle blur animation
  const handleBlur = () => {
    setIsFocused(false);
    
    Animated.timing(focusAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    
    // Hide history with a slight delay to allow for selections
    setTimeout(() => {
      setShowHistory(false);
    }, 200);
  };
  
  // Handle clear button press
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChangeText('');
    }
    inputRef.current?.focus();
  };
  
  // Handle voice search button press
  const handleVoiceSearch = () => {
    // Voice search implementation would go here
    // This is a placeholder for future implementation
    alert('Voice search coming soon!');
  };
  
  // Handle history item selection
  const handleHistoryItemPress = (item) => {
    onHistorySelect(item);
    setShowHistory(false);
    inputRef.current?.blur();
  };
  
  // Interpolate animation values
  const iconColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.TEXT_SECONDARY || '#646464', COLORS.PRIMARY || '#2B68E6'],
  });
  
  // Render search history
  const renderSearchHistory = () => {
    if (!showHistory || searchHistory.length === 0) return null;
    
    return (
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent searches</Text>
        
        <FlatList
          data={searchHistory}
          keyExtractor={(item, index) => `history-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.historyItem}
              onPress={() => handleHistoryItemPress(item)}
            >
              <Ionicons name="time-outline" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.historyItemText} numberOfLines={1}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          style={styles.historyList}
        />
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Animated.View
          style={[
            styles.searchBar,
            isFocused && styles.searchBarFocused,
          ]}
        >
          <Animated.View style={[styles.searchIcon, { tintColor: iconColor }]}>
            <Ionicons name="search" size={20} color={COLORS.TEXT_SECONDARY} />
          </Animated.View>
          
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            returnKeyType="search"
            onSubmitEditing={onSubmit}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          {value ? (
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Ionicons name="close-circle" size={18} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.voiceButton} onPress={handleVoiceSearch}>
              <Ionicons name="mic-outline" size={20} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          )}
        </Animated.View>
        
        <TouchableOpacity style={styles.filterButton} onPress={onFilterToggle}>
          <Ionicons name="options-outline" size={20} color={COLORS.TEXT} />
        </TouchableOpacity>
      </View>
      
      {renderSearchHistory()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.BACKGROUND || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER || '#E5E5E5',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE || '#F7F7F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchBarFocused: {
    backgroundColor: COLORS.BACKGROUND || '#FFFFFF',
    shadowColor: COLORS.TEXT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: COLORS.TEXT || '#121212',
  },
  clearButton: {
    padding: 6,
  },
  voiceButton: {
    padding: 6,
  },
  filterButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE || '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyContainer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: COLORS.BACKGROUND || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER || '#E5E5E5',
    maxHeight: Math.min(300, Dimensions.get('window').height * 0.4),
    zIndex: 999,
    shadowColor: COLORS.TEXT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT || '#121212',
    padding: 12,
    paddingBottom: 8,
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  historyItemText: {
    fontSize: 14,
    color: COLORS.TEXT || '#121212',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.BORDER || '#E5E5E5',
    marginLeft: 36,
  },
});

export default SearchBar;
