import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { COLORS } from '../../../config/constants';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'images', label: 'Images' },
  { id: 'videos', label: 'Videos' },
  { id: 'links', label: 'Links' },
];

const MediaFilterBar = ({ activeFilter, onFilterChange }) => {
  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        {filters.map((filter) => (
          <FilterTab
            key={filter.id}
            filter={filter}
            isActive={activeFilter === filter.id}
            onPress={() => onFilterChange(filter.id)}
          />
        ))}
      </View>
    </View>
  );
};

const FilterTab = ({ filter, isActive, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.filterTab, isActive && styles.activeFilterTab]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterLabel,
          isActive && styles.activeFilterLabel,
        ]}
      >
        {filter.label}
      </Text>
      {isActive && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER || '#E5E5E5',
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: COLORS.BACKGROUND || '#FFFFFF',
  },
  filterTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
    alignItems: 'center', // Center label and indicator
  },
  activeFilterTab: {
    // Add a subtle background or other visual cue if desired
    // Example: backgroundColor: `${COLORS.PRIMARY}1A`, // Primary color with low opacity
    // Example: borderRadius: 6,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY || '#646464',
  },
  activeFilterLabel: {
    fontWeight: 'bold', // Make active label bold
    color: COLORS.PRIMARY || '#2B68E6',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8, // Adjust indicator position if needed
    right: 8, // Adjust indicator position if needed
    height: 3, // Make indicator slightly thicker
    backgroundColor: COLORS.PRIMARY || '#2B68E6',
    borderRadius: 1.5,
  },
});

export default MediaFilterBar;
