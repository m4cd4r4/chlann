import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../config/constants';

/**
 * ResolutionSelector Component
 * 
 * A component that allows users to select different quality levels for viewing media.
 * It displays the current quality and provides a modal with quality options when tapped.
 * 
 * Features:
 * - Visual indicator of current quality
 * - Modal with quality options
 * - Data usage estimates
 * - Auto quality option based on network conditions
 */
const ResolutionSelector = ({
  currentQuality,
  onQualityChange,
  style,
  size,
  estimatedDataUsage,
  showModal = false,
  onToggleModal,
}) => {
  // Quality options
  const qualityOptions = [
    {
      id: 'auto',
      label: 'Auto',
      description: 'Adapts to your network speed',
      icon: 'flash-outline',
      dataUsage: 'Variable',
    },
    {
      id: 'thumbnail',
      label: 'SD',
      description: 'Low resolution (200px)',
      icon: 'speedometer-outline',
      dataUsage: '~30KB',
    },
    {
      id: 'preview',
      label: 'HD',
      description: 'Standard resolution (1080px)',
      icon: 'image-outline',
      dataUsage: '~200KB',
    },
    {
      id: 'high',
      label: '4K',
      description: 'High resolution (2160px)',
      icon: 'star-outline',
      dataUsage: '~2MB',
    },
    {
      id: 'original',
      label: 'RAW',
      description: 'Original uncompressed quality',
      icon: 'diamond-outline',
      dataUsage: '5-20MB',
    },
  ];
  
  // Find current quality details
  const getCurrentQualityOption = () => {
    return qualityOptions.find(option => option.id === currentQuality) || qualityOptions[0];
  };
  
  // Render quality badge
  const renderQualityBadge = () => {
    const option = getCurrentQualityOption();
    
    return (
      <TouchableOpacity
        style={[styles.qualityBadge, style]}
        onPress={onToggleModal}
        activeOpacity={0.7}
      >
        <Text style={styles.qualityLabel}>{option.label}</Text>
        <Text style={styles.qualitySize}>
          {estimatedDataUsage || option.dataUsage}
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Render modal
  const renderModal = () => {
    return (
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={onToggleModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Quality</Text>
            
            <FlatList
              data={qualityOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.qualityOption,
                    item.id === currentQuality && styles.selectedOption,
                  ]}
                  onPress={() => {
                    onQualityChange(item.id);
                    onToggleModal();
                  }}
                >
                  <View style={styles.optionIconContainer}>
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color={item.id === currentQuality ? COLORS.PRIMARY : COLORS.TEXT}
                    />
                  </View>
                  
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        item.id === currentQuality && styles.selectedOptionText,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.optionDescription}>{item.description}</Text>
                  </View>
                  
                  <Text style={styles.optionDataUsage}>{item.dataUsage}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onToggleModal}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  return (
    <>
      {renderQualityBadge()}
      {renderModal()}
    </>
  );
};

const styles = StyleSheet.create({
  qualityBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  qualityLabel: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  qualitySize: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.85,
    backgroundColor: COLORS.BACKGROUND || '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: COLORS.TEXT || '#121212',
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  selectedOption: {
    backgroundColor: `${COLORS.PRIMARY}15`, // 15% opacity
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.LIGHT}80`, // 50% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT || '#121212',
    marginBottom: 4,
  },
  selectedOptionText: {
    color: COLORS.PRIMARY || '#2B68E6',
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY || '#646464',
  },
  optionDataUsage: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY || '#646464',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.BORDER || '#E5E5E5',
    marginVertical: 4,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.PRIMARY || '#2B68E6',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ResolutionSelector;
