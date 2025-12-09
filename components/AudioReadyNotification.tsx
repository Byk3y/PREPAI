/**
 * AudioReadyNotification - Non-intrusive top notification for audio completion
 * Slides down from top with smooth animation
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
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

  const handleListenNow = () => {
    onListenNow();
    router.push(`/audio-player/${overviewId}`);
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.notification}>
        {/* Icon and Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="headset" size={24} color="#4F5BD5" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Audio Ready!</Text>
            <Text style={styles.message} numberOfLines={1}>
              {notebookName} is ready to play
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.laterButton, { marginRight: 8 }]}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.laterText}>Later</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.listenButton}
            onPress={handleListenNow}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.listenText}>Listen Now</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  notification: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 91, 213, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    fontFamily: 'Nunito-SemiBold',
  },
  message: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Nunito-Regular',
  },
  actions: {
    flexDirection: 'row',
  },
  laterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
    fontFamily: 'Nunito-Medium',
  },
  listenButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#4F5BD5',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  listenText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Nunito-SemiBold',
  },
});

