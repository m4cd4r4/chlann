import { useState, useEffect, useCallback, useRef } from 'react';
import SearchService from '../../../../services/searchService'; // Import SearchService
import AsyncStorage from '@react-native-async-storage/async-storage'; // For search history

/**
 * Custom hook for handling media search functionality specifically
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

  // Fetch search results using SearchService
  const fetchSearchResults = useCallback(async (searchQuery, searchFilters, pageNum = 1) => {
    try {
      // Map frontend filters to backend parameters
      const params = {
        query: searchQuery,
        contentTypes: ['media'], // Always search for media in this hook
        // Map other filters if needed (e.g., dateRange, peopleTagged)
        // peopleTagged: searchFilters.peopleTagged,
        startDate: searchFilters.dateRange?.start,
        endDate: searchFilters.dateRange?.end,
        page: pageNum,
        limit: 20 // Or make limit configurable
      };

      const response = await SearchService.search(
        params.query,
        params.contentTypes,
        null, // conversationId - not typically used in global media search
        params.peopleTagged,
        params.startDate,
        params.endDate,
        params.page,
        params.limit
      );

      // Assuming response structure is { results: [...], pagination: { total, page, limit, pages } }
      return {
        results: response.results || [],
        hasMore: response.pagination ? (response.pagination.page * response.pagination.limit) < response.pagination.total : false
      };
    } catch (error) {
      console.error('Error fetching media search results:', error);
      throw error; // Re-throw to be caught by calling function
    }
  }, []); // Empty dependency array as SearchService is static

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
        const newHistory = [searchQuery, ...searchHistory.filter(item => item !== searchQuery).slice(0, 9)];
        setSearchHistory(newHistory);
        // Save history to persistent storage
        AsyncStorage.setItem('mediaSearchHistory', JSON.stringify(newHistory)).catch(console.error);
      } catch (err) {
        setError(err.message || 'An error occurred while searching');
        setResults([]); // Clear results on error
        setHasMore(false);
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
    // Reset pagination when filters change
    setPage(1);
    setHasMore(true);
    setFilters(prev => ({ ...prev, ...newFilters }));
    // Search will be triggered by useEffect watching filters
  }, []);

  // Clear all search and filters
  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters({ // Reset filters to initial/default state
      // types: [], // Keep contentTypes as ['media'] implicitly
      dateRange: { start: null, end: null },
      // quality: null, // Add other filter resets if needed
      // peopleTagged: null
    });
    setResults([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  // Handle history item selection
  const selectHistoryItem = useCallback((historyItem) => {
    setQuery(historyItem);
  }, []);

  // Load search history on mount
  useEffect(() => {
    AsyncStorage.getItem('mediaSearchHistory')
      .then(history => {
        if (history) {
          setSearchHistory(JSON.parse(history));
        }
      })
      .catch(console.error);
  }, []);

  // Load initial data & Clear search timeout on unmount
  useEffect(() => {
    // Trigger initial search if needed (e.g., if initialQuery is set)
    // performSearch(query, filters); // Already handled by the next useEffect

    // Cleanup function
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []); // Run only once on mount

  // Trigger search when query or filters change (debounced)
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
