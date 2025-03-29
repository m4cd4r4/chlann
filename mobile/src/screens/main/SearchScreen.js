import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../config/constants';

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('people'); // 'people', 'messages', 'media'
  
  const navigation = useNavigation();
  
  // Perform search when query changes or tab changes
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab]);
  
  const performSearch = async () => {
    if (searchQuery.trim().length === 0) return;
    
    setIsLoading(true);
    
    try {
      // In a real app, this would call an API endpoint
      // For now, we'll just simulate a search with mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock search results based on active tab
      let results = [];
      
      if (activeTab === 'people') {
        results = [
          { id: '1', type: 'user', name: 'John Smith', username: '@johnsmith', avatar: null },
          { id: '2', type: 'user', name: 'Sarah Johnson', username: '@sarahj', avatar: null },
          { id: '3', type: 'user', name: 'Michael Brown', username: '@mikebrown', avatar: null },
        ].filter(user => 
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.username.toLowerCase().includes(searchQuery.toLowerCase())
        );
      } else if (activeTab === 'messages') {
        results = [
          { id: '1', type: 'message', content: 'Hey, how are you doing?', sender: 'John Smith', timestamp: '2h ago' },
          { id: '2', type: 'message', content: 'Did you see the latest photos?', sender: 'Sarah Johnson', timestamp: '1d ago' },
          { id: '3', type: 'message', content: 'Let\'s meet up this weekend', sender: 'Michael Brown', timestamp: '3d ago' },
        ].filter(message => 
          message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          message.sender.toLowerCase().includes(searchQuery.toLowerCase())
        );
      } else if (activeTab === 'media') {
        // For media search, we'll redirect to the dedicated media search screen
        navigation.navigate('MediaSearch', { initialQuery: searchQuery });
        results = [];
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderSearchResult = ({ item }) => {
    if (item.type === 'user') {
      return (
        <TouchableOpacity 
          style={styles.resultItem}
          onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
        >
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
          <View style={styles.resultContent}>
            <Text style={styles.resultTitle}>{item.name}</Text>
            <Text style={styles.resultSubtitle}>{item.username}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
        </TouchableOpacity>
      );
    } else if (item.type === 'message') {
      return (
        <TouchableOpacity 
          style={styles.resultItem}
          onPress={() => navigation.navigate('Chat', { name: item.sender })}
        >
          <View style={styles.messageIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.PRIMARY} />
          </View>
          <View style={styles.resultContent}>
            <View style={styles.messageHeader}>
              <Text style={styles.resultTitle}>{item.sender}</Text>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
            </View>
            <Text 
              style={styles.resultSubtitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.content}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    
    return null;
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Search</Text>
        </View>
        
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={COLORS.MUTED} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people, messages, media..."
              placeholderTextColor={COLORS.MUTED}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={performSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.MUTED} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'people' && styles.activeTab]}
            onPress={() => setActiveTab('people')}
          >
            <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>
              People
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
            onPress={() => setActiveTab('messages')}
          >
            <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
              Messages
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'media' && styles.activeTab]}
            onPress={() => setActiveTab('media')}
          >
            <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>
              Media
            </Text>
          </TouchableOpacity>
        </View>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          </View>
        ) : searchQuery.length > 0 && searchResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={COLORS.MUTED} />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>
              Try a different search term or category
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
  },
  activeTab: {
    backgroundColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
  },
  activeTabText: {
    color: COLORS.WHITE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  resultsList: {
    paddingHorizontal: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  messageIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.MUTED,
  },
});

export default SearchScreen;
