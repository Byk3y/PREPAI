/**
 * AudioReadyNotification - iOS-style compact notification banner
 * Slides down from top, auto-dismisses, swipeable to dismiss
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface AudioReadyNotificationProps {
  visible: boolean;
  notebookName: string;
  overviewId: string;
  onDismiss: () => void;
  onListenNow: () => void;
}

const AUTO_DISMISS_DELAY = 5000; // 5 seconds
const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger dismiss

export const AudioReadyNotification: React.FC<AudioReadyNotificationProps> = ({
  visible,
  notebookName,
  overviewId,
  onDismiss,
  onListenNow,
}) => {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-100)).current; // Start above screen
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const autoDismissTimer = useRef<NodeJS.Timeout | null>(null);
  const currentOffset = useRef(0);

  const handleDismiss = useCallback(() => {
    // Clear auto-dismiss timer
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
    onDismiss();
  }, [onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (visible) {
      // Clear any existing timer
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }

      // Set new auto-dismiss timer
      autoDismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, AUTO_DISMISS_DELAY);
    } else {
      // Clear timer when not visible
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
        autoDismissTimer.current = null;
      }
    }

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, [visible, handleDismiss]);

  // Animation when visibility changes
  useEffect(() => {
    if (visible) {
      // Slide down and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide up and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleTap = useCallback(() => {
    // Clear auto-dismiss timer when user interacts
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
    onListenNow();
    router.push(`/audio-player/${overviewId}`);
  }, [onListenNow, router, overviewId]);

  // PanResponder for swipe-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to upward swipes (negative dy)
        return gestureState.dy < -5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        // Clear auto-dismiss timer when user starts interacting
        if (autoDismissTimer.current) {
          clearTimeout(autoDismissTimer.current);
          autoDismissTimer.current = null;
        }
        // Stop any ongoing animations
        panY.stopAnimation();
        // Set offset to current position
        panY.setOffset(currentOffset.current);
        panY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow upward movement (negative dy)
        if (gestureState.dy < 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
        currentOffset.current = 0;

        // If swiped up enough, dismiss
        if (gestureState.dy < -SWIPE_THRESHOLD || gestureState.vy < -0.5) {
          Animated.timing(panY, {
            toValue: -150,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            panY.setValue(0);
            handleDismiss();
          });
        } else {
          // Spring back to original position
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: Animated.add(slideAnim, panY),
            },
          ],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Animated.View
          style={styles.notification}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            onPress={handleTap}
            activeOpacity={0.8}
            style={styles.touchableContent}
          >
            {/* Icon and Content */}
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Ionicons name="headset" size={20} color="#4F5BD5" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>Podcast Ready!</Text>
                <Text style={styles.message} numberOfLines={1}>
                  {notebookName} is ready to play
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  safeArea: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  notification: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  touchableContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(79, 91, 213, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    fontFamily: 'Nunito-SemiBold',
  },
  message: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: 'Nunito-Regular',
  },
});

