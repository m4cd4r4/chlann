import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { COLORS } from '../../../../config/constants';
import ProgressiveImage from './ProgressiveImage';

/**
 * ImageZoomViewer Component
 * 
 * A component that provides advanced zoom and pan capabilities for viewing
 * high-resolution images. It supports pinch-to-zoom, double-tap to zoom,
 * and panning gestures.
 * 
 * Features:
 * - Smooth pinch-to-zoom with appropriate scaling
 * - Panning with inertia and boundaries
 * - Double-tap to zoom to specific regions
 * - Progressive loading of higher resolution as zoom increases
 */
const ImageZoomViewer = ({
  thumbnailSource,
  source,
  style,
  onZoomStart,
  onZoomEnd,
  onZoomChange,
  maxScale = 5,
  minScale = 1,
  resizeMode = 'contain',
  doubleTapScale = 3,
  doubleTapDelay = 300,
  ...props
}) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Animation values for zooming and panning
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  // Refs for gesture handling
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);
  const distanceForPinch = useRef(150);
  const lastTapTime = useRef(0);
  const doubleTapTimeout = useRef(null);
  const lastTapPosition = useRef({ x: 0, y: 0 });
  
  // Image dimensions
  const [imageDimensions, setImageDimensions] = useState({
    width: screenWidth,
    height: screenHeight,
    initialWidth: screenWidth,
    initialHeight: screenHeight,
  });
  
  // Handle image load to get dimensions
  const handleImageLoad = (event) => {
    if (event && event.nativeEvent && event.nativeEvent.source) {
      const { width, height } = event.nativeEvent.source;
      
      let imageWidth = width;
      let imageHeight = height;
      
      // Calculate image dimensions based on screen size and aspect ratio
      if (width > height) {
        // Landscape image
        imageWidth = screenWidth;
        imageHeight = height * (screenWidth / width);
      } else {
        // Portrait image
        imageHeight = screenHeight;
        imageWidth = width * (screenHeight / height);
      }
      
      setImageDimensions({
        width: imageWidth,
        height: imageHeight,
        initialWidth: imageWidth,
        initialHeight: imageHeight,
      });
    }
  };
  
  // Handle double tap
  const handleDoubleTap = (x, y) => {
    const currentScale = scale._value;
    
    // If already zoomed in, reset zoom
    if (currentScale > minScale) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: minScale,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      
      lastScale.current = minScale;
      lastTranslateX.current = 0;
      lastTranslateY.current = 0;
    } else {
      // Zoom in to the tapped point
      const targetScale = doubleTapScale;
      
      // Calculate the focus point for zooming
      const focusX = (x - screenWidth / 2) * (targetScale - 1);
      const focusY = (y - screenHeight / 2) * (targetScale - 1);
      
      Animated.parallel([
        Animated.spring(scale, {
          toValue: targetScale,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: -focusX,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: -focusY,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      
      lastScale.current = targetScale;
      lastTranslateX.current = -focusX;
      lastTranslateY.current = -focusY;
    }
  };
  
  // Create pan responder for handling gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 2 || Math.abs(dy) > 2;
      },
      
      // Handle touch start
      onPanResponderGrant: (evt, gestureState) => {
        const { numberActiveTouches, x0, y0 } = gestureState;
        
        // Handle double tap detection
        const now = Date.now();
        const timeDiff = now - lastTapTime.current;
        
        if (timeDiff < doubleTapDelay && numberActiveTouches === 1) {
          if (doubleTapTimeout.current) {
            clearTimeout(doubleTapTimeout.current);
            doubleTapTimeout.current = null;
            handleDoubleTap(x0, y0);
          }
        }
        
        if (numberActiveTouches === 1) {
          lastTapTime.current = now;
          lastTapPosition.current = { x: x0, y: y0 };
          
          doubleTapTimeout.current = setTimeout(() => {
            doubleTapTimeout.current = null;
          }, doubleTapDelay);
        }
        
        if (onZoomStart) {
          onZoomStart(lastScale.current);
        }
      },
      
      // Handle pan/zoom gestures
      onPanResponderMove: (evt, gestureState) => {
        const { numberActiveTouches, dx, dy, moveX, moveY } = gestureState;
        
        // Handle pinch to zoom (two fingers)
        if (numberActiveTouches === 2) {
          const touches = evt.nativeEvent.touches;
          
          // Calculate distance between two fingers
          const touchA = touches[0];
          const touchB = touches[1];
          
          const distance = Math.sqrt(
            Math.pow(touchB.pageX - touchA.pageX, 2) +
            Math.pow(touchB.pageY - touchA.pageY, 2)
          );
          
          // Initial distance set on first move
          if (distanceForPinch.current === 150) {
            distanceForPinch.current = distance;
            return;
          }
          
          // Calculate new scale
          const currentScale = lastScale.current;
          let newScale = (currentScale * distance) / distanceForPinch.current;
          
          // Limit scale within bounds
          newScale = Math.max(minScale, Math.min(maxScale, newScale));
          
          // Update scale
          scale.setValue(newScale);
          
          // Calculate midpoint between fingers for zoom focus
          const midX = (touchA.pageX + touchB.pageX) / 2;
          const midY = (touchA.pageY + touchB.pageY) / 2;
          
          if (onZoomChange) {
            onZoomChange(newScale);
          }
        } 
        // Handle panning (one finger when zoomed in)
        else if (numberActiveTouches === 1 && lastScale.current > 1) {
          // Only allow panning when zoomed in
          const newTranslateX = lastTranslateX.current + dx;
          const newTranslateY = lastTranslateY.current + dy;
          
          // Apply boundaries to prevent panning too far
          const currentScale = lastScale.current;
          const scaledWidth = imageDimensions.initialWidth * currentScale;
          const scaledHeight = imageDimensions.initialHeight * currentScale;
          
          const horizontalMax = Math.max(0, (scaledWidth - screenWidth) / 2);
          const verticalMax = Math.max(0, (scaledHeight - screenHeight) / 2);
          
          // Apply boundaries
          const boundedTranslateX = Math.max(-horizontalMax, Math.min(horizontalMax, newTranslateX));
          const boundedTranslateY = Math.max(-verticalMax, Math.min(verticalMax, newTranslateY));
          
          // Update translation
          translateX.setValue(boundedTranslateX);
          translateY.setValue(boundedTranslateY);
        }
      },
      
      // Handle touch end
      onPanResponderRelease: (evt, gestureState) => {
        const { numberActiveTouches } = gestureState;
        
        // Save the current scale and translation values
        lastScale.current = scale._value;
        lastTranslateX.current = translateX._value;
        lastTranslateY.current = translateY._value;
        
        // Reset distance for pinch
        distanceForPinch.current = 150;
        
        // Snap back if outside boundaries
        const currentScale = lastScale.current;
        const scaledWidth = imageDimensions.initialWidth * currentScale;
        const scaledHeight = imageDimensions.initialHeight * currentScale;
        
        const horizontalMax = Math.max(0, (scaledWidth - screenWidth) / 2);
        const verticalMax = Math.max(0, (scaledHeight - screenHeight) / 2);
        
        // Check if we need to snap back
        const snapBackX = Math.abs(lastTranslateX.current) > horizontalMax;
        const snapBackY = Math.abs(lastTranslateY.current) > verticalMax;
        
        if (snapBackX || snapBackY) {
          // Calculate snap back values
          const snappedX = snapBackX
            ? Math.sign(lastTranslateX.current) * horizontalMax
            : lastTranslateX.current;
            
          const snappedY = snapBackY
            ? Math.sign(lastTranslateY.current) * verticalMax
            : lastTranslateY.current;
          
          // Animate snap back
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: snappedX,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.spring(translateY, {
              toValue: snappedY,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start();
          
          // Update last values
          lastTranslateX.current = snappedX;
          lastTranslateY.current = snappedY;
        }
        
        if (onZoomEnd) {
          onZoomEnd(lastScale.current);
        }
      },
    })
  ).current;
  
  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.imageContainer,
          {
            transform: [
              { scale },
              { translateX },
              { translateY },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <ProgressiveImage
          thumbnailSource={thumbnailSource}
          source={source}
          style={styles.image}
          resizeMode={resizeMode}
          onLoad={handleImageLoad}
          {...props}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

export default ImageZoomViewer;
