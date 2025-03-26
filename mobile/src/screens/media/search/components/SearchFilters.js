import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../config/constants';

/**
 * SearchFilters Component
 * 
 * A component that provides advanced filtering options for media search:
 * - Media type selection (photos, videos, documents)
 * - Date range selection (calendar or relative options)
 * - Quality/resolution filtering
 */
const SearchFilters = ({
  filters = {
    types: [],
    dateRange: { start: null, end: null },
    quality: null,
  },
  onChange,
  onClose,
}) => {
  // Media type options
  const mediaTypeOptions = [
    { id: 'image', label: 'Photos', icon: 'image-outline' },
    { id: 'video', label: 'Videos', icon: 'videocam-outline' },
    { id: 'document', label: 'Documents', icon: 'document-text-outline' },
  ];
  
  // Quality options
  const qualityOptions = [
    { id: null, label: 'Any' },
    { id: 'SD', label: 'SD' },
    { id: 'HD', label: 'HD or better' },
    { id: '4K', label: '4K or better' },
  ];
  
  // Date range options
  const dateRangeOptions = [
    { id: 'all', label: 'Any time' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This week' },
    { id: 'month', label: 'This month' },
    { id: 'year', label: 'This year' },
    { id: 'custom', label: 'Custom range' },
  ];
  
  // State for managing which filter section is expanded
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const heightAnim = useState(new Animated.Value(0))[0];
  
  // Handle toggle section expansion
  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };
  
  // Handle media type toggle
  const toggleMediaType = (type) => {
    const currentTypes = [...filters.types];
    const index = currentTypes.indexOf(type);
    
    if (index >= 0) {
      currentTypes.splice(index, 1);
    } else {
      currentTypes.push(type);
    }
    
    onChange({ ...filters, types: currentTypes });
  };
  
  // Handle quality selection
  const selectQuality = (quality) => {
    onChange({ ...filters, quality });
  };
  
  // Handle date range selection
  const selectDateRange = (rangeId) => {
    let dateRange = { start: null, end: null };
    const now = new Date();
    
    switch (rangeId) {
      case 'today':
        dateRange = {
          start: new Date(now.setHours(0, 0, 0, 0)).toISOString(),
          end: new Date().toISOString(),
        };
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        dateRange = {
          start: weekStart.toISOString(),
          end: new Date().toISOString(),
        };
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateRange = {
          start: monthStart.toISOString(),
          end: new Date().toISOString(),
        };
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        dateRange = {
          start: yearStart.toISOString(),
          end: new Date().toISOString(),
        };
        break;
      // Custom range would open a date picker
      case 'custom':
        // This would be replaced with a date picker implementation
        alert('Custom date range picker would open here');
        return;
      default:
        // 'all' or any other value defaults to no date range
        dateRange = { start: null, end: null };
    }
    
    onChange({ ...filters, dateRange });
  };
  
  // Render the filter indicators showing active filters
  const renderFilterIndicators = () => {
    const activeFilters = [];
    
    if (filters.types.length > 0) {
      activeFilters.push(
        <View key="types" style={styles.indicator}>
          <Text style={styles.indicatorText}>
            {filters.types.length === 1
              ? mediaTypeOptions.find(opt => opt.id === filters.types[0])?.label
              : `${filters.types.length} types`}
          </Text>
        </View>
      );
    }
    
    if (filters.dateRange.start) {
      activeFilters.push(
        <View key="date" style={styles.indicator}>
          <Text style={styles.indicatorText}>
            {new Date(filters.dateRange.start).toLocaleDateString()}
            {filters.dateRange.end && ` - ${new Date(filters.dateRange.end).toLocaleDateString()}`}
          </Text>
        </View>
      );
    }
    
    if (filters.quality) {
      activeFilters.push(
        <View key="quality" style={styles.indicator}>
          <Text style={styles.indicatorText}>
            {filters.quality}+
          </Text>
        </View>
      );
    }
    
    if (activeFilters.length === 0) {
      return (
        <Text style={styles.noFiltersText}>No filters applied</Text>
      );
    }
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.indicatorsContainer}
      >
        {activeFilters}
        
        {/* Clear all button */}
        {activeFilters.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onChange({
              types: [],
              dateRange: { start: null, end: null },
              quality: null,
            })}
          >
            <Text style={styles.clearButtonText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };
  
  // Render the content for each expandable section
  const renderSectionContent = (section) => {
    if (expandedSection !== section) return null;
    
    switch (section) {
      case 'type':
        return (
          <View style={styles.sectionContent}>
            <View style={styles.mediaTypeOptions}>
              {mediaTypeOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.mediaTypeOption,
                    filters.types.includes(option.id) && styles.mediaTypeOptionSelected,
                  ]}
                  onPress={() => toggleMediaType(option.id)}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={filters.types.includes(option.id) ? COLORS.WHITE : COLORS.TEXT}
                  />
                  <Text
                    style={[
                      styles.mediaTypeLabel,
                      filters.types.includes(option.id) && styles.mediaTypeLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
        
      case 'date':
        return (
          <View style={styles.sectionContent}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dateRangeOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.dateOption,
                    option.id === 'all' && 
                    !filters.dateRange.start &&
                    !filters.dateRange.end && 
                    styles.dateOptionSelected,
                  ]}
                  onPress={() => selectDateRange(option.id)}
                >
                  <Text
                    style={[
                      styles.dateOptionText,
                      option.id === 'all' && 
                      !filters.dateRange.start &&
                      !filters.dateRange.end && 
                      styles.dateOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
        
      case 'quality':
        return (
          <View style={styles.sectionContent}>
            <View style={styles.qualityOptions}>
              {qualityOptions.map(option => (
                <TouchableOpacity
                  key={option.id || 'any'}
                  style={[
                    styles.qualityOption,
                    filters.quality === option.id && styles.qualityOptionSelected,
                  ]}
                  onPress={() => selectQuality(option.id)}
                >
                  <Text
                    style={[
                      styles.qualityOptionText,
                      filters.quality === option.id && styles.qualityOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Animated.View style={styles.container}>
      {/* Filter indicators */}
      <View style={styles.filterIndicators}>
        {renderFilterIndicators()}
      </View>
      
      {/* Filter sections */}
      <View style={styles.sections}>
        {/* Media type section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('type')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons name="images-outline" size={20} color={COLORS.TEXT} />
              <Text style={styles.sectionTitle}>Media Type</Text>
            </View>
            <Ionicons
              name={expandedSection === 'type' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.TEXT}
            />
          </TouchableOpacity>
          {renderSectionContent('type')}
        </View>
        
        {/* Date range section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('date')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.TEXT} />
              <Text style={styles.sectionTitle}>Date</Text>
            </View>
            <Ionicons
              name={expandedSection === 'date' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.TEXT}
            />
          </TouchableOpacity>
          {renderSectionContent('date')}
        </View>
        
        {/* Quality section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('quality')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons name="sparkles-outline" size={20} color={COLORS.TEXT} />
              <Text style={styles.sectionTitle}>Quality</Text>
            </View>
            <Ionicons
              name={expandedSection === 'quality' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.TEXT}
            />
          </TouchableOpacity>
          {renderSectionContent('quality')}
        </View>
      </View>
      
      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close Filters</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.BACKGROUND || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER || '#E5E5E5',
    paddingBottom: 12,
  },
  filterIndicators: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noFiltersText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY || '#646464',
    fontStyle: 'italic',
  },
  indicatorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    backgroundColor: COLORS.SURFACE || '#F7F7F7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  indicatorText: {
    fontSize: 14,
    color: COLORS.TEXT || '#121212',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.PRIMARY || '#2B68E6',
    fontWeight: '500',
  },
  sections: {
    paddingHorizontal: 12,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE || '#F7F7F7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT || '#121212',
    marginLeft: 8,
  },
  sectionContent: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  mediaTypeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mediaTypeOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    width: 90,
  },
  mediaTypeOptionSelected: {
    backgroundColor: COLORS.PRIMARY || '#2B68E6',
  },
  mediaTypeLabel: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.TEXT || '#121212',
  },
  mediaTypeLabelSelected: {
    color: COLORS.WHITE || '#FFFFFF',
  },
  dateOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER || '#E5E5E5',
  },
  dateOptionSelected: {
    backgroundColor: COLORS.PRIMARY || '#2B68E6',
    borderColor: COLORS.PRIMARY || '#2B68E6',
  },
  dateOptionText: {
    fontSize: 14,
    color: COLORS.TEXT || '#121212',
  },
  dateOptionTextSelected: {
    color: COLORS.WHITE || '#FFFFFF',
  },
  qualityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qualityOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER || '#E5E5E5',
  },
  qualityOptionSelected: {
    backgroundColor: COLORS.PRIMARY || '#2B68E6',
    borderColor: COLORS.PRIMARY || '#2B68E6',
  },
  qualityOptionText: {
    fontSize: 14,
    color: COLORS.TEXT || '#121212',
  },
  qualityOptionTextSelected: {
    color: COLORS.WHITE || '#FFFFFF',
  },
  closeButton: {
    marginTop: 8,
    marginHorizontal: 12,
    backgroundColor: COLORS.SURFACE || '#F7F7F7',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT || '#121212',
  },
});

export default SearchFilters;
