import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../config/constants';

const EmptyStateView = ({ activeFilter }) => {
  // Customize empty state message based on active filter
  const getMessage = () => {
    switch (activeFilter) {
      case 'images':
        return {
          title: 'No images found',
          description: 'Photos shared in your conversations will appear here',
          icon: 'image-outline',
        };
      case 'videos':
        return {
          title: 'No videos found',
          description: 'Videos shared in your conversations will appear here',
          icon: 'videocam-outline',
        };
      case 'links':
        return {
          title: 'No links found',
          description: 'Links shared in your conversations will appear here',
          icon: 'link-outline',
        };
      case 'all':
      default:
        return {
          title: 'No media found',
          description: 'Share photos and videos in your conversations to see them here',
          icon: 'images-outline',
        };
    }
  };
  
  const { title, description, icon } = getMessage();
  
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={60} color={COLORS.TEXT_SECONDARY || '#646464'} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.LIGHT || '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT || '#121212',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY || '#646464',
    textAlign: 'center',
    maxWidth: 250,
  },
});

export default EmptyStateView;
