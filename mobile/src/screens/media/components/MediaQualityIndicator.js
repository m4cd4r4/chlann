import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MediaQualityIndicator = ({ quality }) => {
  // Determine badge color based on quality
  const getBadgeStyles = () => {
    switch (quality) {
      case 'HD':
        return {
          container: styles.hdContainer,
          text: styles.hdText,
        };
      case '4K':
        return {
          container: styles.fourKContainer,
          text: styles.fourKText,
        };
      case 'RAW':
        return {
          container: styles.rawContainer,
          text: styles.rawText,
        };
      case 'SD':
      default:
        return {
          container: styles.sdContainer,
          text: styles.sdText,
        };
    }
  };
  
  const badgeStyles = getBadgeStyles();
  
  return (
    <View style={[styles.container, badgeStyles.container]}>
      <Text style={[styles.text, badgeStyles.text]}>{quality}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  // SD styles (gray)
  sdContainer: {
    backgroundColor: 'rgba(100, 100, 100, 0.7)',
  },
  sdText: {
    color: 'white',
  },
  // HD styles (blue)
  hdContainer: {
    backgroundColor: 'rgba(43, 104, 230, 0.7)',
  },
  hdText: {
    color: 'white',
  },
  // 4K styles (green)
  fourKContainer: {
    backgroundColor: 'rgba(52, 199, 89, 0.7)',
  },
  fourKText: {
    color: 'white',
  },
  // RAW styles (purple)
  rawContainer: {
    backgroundColor: 'rgba(175, 82, 222, 0.7)',
  },
  rawText: {
    color: 'white',
  },
});

export default MediaQualityIndicator;
