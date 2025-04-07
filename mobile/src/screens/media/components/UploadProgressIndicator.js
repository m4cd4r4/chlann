import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { COLORS } from '../../../config/constants';

const UploadProgressIndicator = ({ progressData }) => {
  const activeUploads = useMemo(() => Object.entries(progressData), [progressData]);
  const uploadCount = activeUploads.length;

  if (uploadCount === 0) {
    return null; // Don't render anything if no uploads are active
  }

  // Calculate average progress (optional, could also just show count)
  const totalProgress = activeUploads.reduce((sum, [, progress]) => sum + progress, 0);
  const averageProgress = uploadCount > 0 ? Math.round(totalProgress / uploadCount) : 0;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={COLORS.TEXT_SECONDARY || '#646464'} />
      <Text style={styles.text}>
        {`Uploading ${uploadCount} item${uploadCount > 1 ? 's' : ''}... (${averageProgress}%)`}
      </Text>
      {/* Optional: Add a visual progress bar here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 70, // Position above FAB, adjust as needed
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent background
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    // Add shadow/elevation if desired
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  text: {
    marginLeft: 8,
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default UploadProgressIndicator;
