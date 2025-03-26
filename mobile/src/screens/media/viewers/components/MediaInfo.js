import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../config/constants';

/**
 * MediaInfo Component
 * 
 * A component that displays detailed information about media including
 * resolution, size, EXIF data, and location information. It's displayed
 * as an overlay on top of the media viewer.
 * 
 * Features:
 * - Technical specifications display
 * - EXIF data formatting
 * - Location display with privacy controls
 * - Scrollable for extensive metadata
 */
const MediaInfo = ({
  media,
  onClose,
  style,
  showLocation = true,
}) => {
  // Skip rendering if no media data
  if (!media) return null;
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };
  
  // Extract EXIF data into display sections
  const sections = [
    {
      title: 'File Information',
      items: [
        { label: 'Resolution', value: `${media.width} × ${media.height}` },
        { label: 'File Size', value: media.size?.original || 'Unknown' },
        { label: 'File Type', value: media.type?.toUpperCase() || 'Unknown' },
        { label: 'Date Created', value: formatDate(media.createdAt) },
      ],
    },
  ];
  
  // Add camera info if available
  if (media.metadata) {
    sections.push({
      title: 'Camera Information',
      items: [
        { label: 'Device', value: media.metadata.camera || 'Unknown' },
        { label: 'Aperture', value: media.metadata.aperture || 'Unknown' },
        { label: 'Exposure', value: media.metadata.exposureTime || 'Unknown' },
        { label: 'ISO', value: media.metadata.iso || 'Unknown' },
      ],
    });
  }
  
  // Add location if available and enabled
  if (showLocation && media.metadata && media.metadata.location) {
    sections.push({
      title: 'Location Information',
      items: [
        { label: 'Location', value: media.metadata.location || 'Unknown' },
      ],
    });
  }
  
  return (
    <SafeAreaView style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Media Information</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        {sections.map((section, sectionIndex) => (
          <View key={`section-${sectionIndex}`} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            
            {section.items.map((item, itemIndex) => (
              <View key={`item-${sectionIndex}-${itemIndex}`} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        ))}
        
        {/* Privacy notice if location shown */}
        {showLocation && (
          <View style={styles.privacyNotice}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.privacyText}>
              Location information is only visible to you and not shared with others.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.PRIMARY || '#2B68E6',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.WHITE,
    maxWidth: '60%',
    textAlign: 'right',
  },
  privacyNotice: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    alignItems: 'center',
  },
  privacyText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY || '#646464',
    marginLeft: 8,
    flex: 1,
  },
});

export default MediaInfo;
