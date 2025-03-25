import React from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import MediaGridItem from './MediaGridItem';

const { width } = Dimensions.get('window');

const MediaGrid = ({
  data,
  numColumns = 3,
  onItemPress,
  onItemLongPress,
  refreshControl,
  selectedItems = [],
  isSelectionMode = false,
}) => {
  // Calculate item dimensions based on screen width and number of columns
  const gap = 2;
  const itemWidth = (width - (numColumns + 1) * gap) / numColumns;
  
  // Render grid item
  const renderItem = ({ item, index }) => {
    const isSelected = selectedItems.some(selectedItem => selectedItem.id === item.id);
    
    return (
      <MediaGridItem
        item={item}
        width={itemWidth}
        height={itemWidth}
        onPress={() => onItemPress(item)}
        onLongPress={() => onItemLongPress(item)}
        isSelected={isSelected}
        isSelectionMode={isSelectionMode}
      />
    );
  };
  
  // Render separator
  const ItemSeparatorComponent = () => <View style={{ height: gap }} />;
  
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      numColumns={numColumns}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
      columnWrapperStyle={{ gap }}
      ItemSeparatorComponent={ItemSeparatorComponent}
      refreshControl={refreshControl}
      windowSize={10} // Performance optimization
      maxToRenderPerBatch={10} // Performance optimization
      removeClippedSubviews={Platform.OS === 'android'} // Performance optimization for Android
    />
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: 2,
  },
});

export default MediaGrid;
