import { useState, useEffect, useCallback, useRef } from 'react';
import mediaProcessingApi from '../utils/mediaProcessingApi';

/**
 * Custom hook for handling media search functionality
 * 
 * This hook centralizes the search logic, separating business logic from UI components.
 * 
 * Features:
 * - Debounced search to prevent excessive API calls
 * - Pagination for large result sets
 * - Support for filter combinations 
 * - Search history management
 */
const useMediaSearch = (initialQuery = '', initialFilters = {}) => {
  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState(initialFilters);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Search history
  const [searchHistory, setSearchHistory] = useState([]);
  
  // Refs for debouncing
  const searchTimeout = useRef(null);
  
  // Fetch search results from the media processing API
  const fetchSearchResults = useCallback(async (searchQuery, searchFilters, pageNum = 1) => {
    try {
      const response = await mediaProcessingApi.searchMedia({
        query: searchQuery,
        mediaTypes: searchFilters.types,
        dateRange: searchFilters.dateRange,
        quality: searchFilters.quality,
        page: pageNum,
        limit: 20
      });
      
      // Format API response to match hook's expected structure
      return {
        results: response.results,
        hasMore: response.hasMore
      };
    } catch (error) {
      console.error('Error fetching search results:', error);
      throw error;
    }
  }, []);
  
  // Perform search with debounce
  const performSearch = useCallback((searchQuery, searchFilters) => {
    // Clear any pending search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Set loading state
    setLoading(true);
    setError(null);
    
    // Execute search after debounce delay
    searchTimeout.current = setTimeout(async () => {
      try {
        const { results: searchResults, hasMore: moreResults } = await fetchSearchResults(searchQuery, searchFilters);
        setResults(searchResults);
        setHasMore(moreResults);
        setPage(1);
        
        // Update search history if it's a real search (not empty)
        if (searchQuery && searchQuery.trim() !== '' && !searchHistory.includes(searchQuery)) {
          setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]);
          
          // In a real app, save history to persistent storage
          // AsyncStorage.setItem('searchHistory', JSON.stringify([searchQuery, ...searchHistory.slice(0, 9)]));
        }
      } catch (err) {
        setError(err.message || 'An error occurred while searching');
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce
  }, [fetchSearchResults, searchHistory]);
  
  // Load more results for pagination
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    setError(null);
    
    try {
      const nextPage = page + 1;
      const { results: newResults, hasMore: moreResults } = await fetchSearchResults(query, filters, nextPage);
      
      setResults(prevResults => [...prevResults, ...newResults]);
      setHasMore(moreResults);
      setPage(nextPage);
    } catch (err) {
      setError(err.message || 'An error occurred while loading more results');
    } finally {
      setLoadingMore(false);
    }
  }, [fetchSearchResults, query, filters, page, hasMore, loadingMore]);
  
  // Handle query change
  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery);
  }, []);
  
  // Handle filters change
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
  
  // Clear all search and filters
  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters({
      types: [],
      dateRange: { start: null, end: null },
      quality: null,
    });
  }, []);
  
  // Handle history item selection
  const selectHistoryItem = useCallback((historyItem) => {
    setQuery(historyItem);
  }, []);
  
  // Load initial data
  useEffect(() => {
    // Clear search timeout on unmount
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);
  
  // Trigger search when query or filters change
  useEffect(() => {
    performSearch(query, filters);
  }, [query, filters, performSearch]);
  
  // Return the hook API
  return {
    // State
    query,
    filters,
    results,
    loading,
    loadingMore,
    error,
    hasMore,
    searchHistory,
    
    // Actions
    handleQueryChange,
    handleFiltersChange,
    loadMore,
    clearSearch,
    selectHistoryItem,
  };
};

export default useMediaSearch;
