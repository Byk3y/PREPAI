/**
 * Material Type Selector Modal
 * Full screen modal for selecting upload material type to create study notebooks
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type MaterialType = 'pdf' | 'audio' | 'image' | 'website' | 'youtube' | 'copied-text';

interface MaterialTypeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: MaterialType) => void;
}

export default function MaterialTypeSelector({
  visible,
  onClose,
  onSelectType,
}: MaterialTypeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Track current translateY value
  const currentTranslateY = useRef(0);
  useEffect(() => {
    const listenerId = translateY.addListener(({ value }) => {
      currentTranslateY.current = value;
    });
    return () => {
      translateY.removeListener(listenerId);
    };
  }, []);

  // Animate in when visible changes
  useEffect(() => {
    if (visible) {
      // Stop any ongoing animations and reset state
      translateY.stopAnimation((finalValue) => {
        // Reset to starting position
        translateY.setValue(SCREEN_HEIGHT);
        currentTranslateY.current = SCREEN_HEIGHT;
        // Reset offset to ensure clean state
        translateY.setOffset(0);
        translateY.flattenOffset();
        
        requestAnimationFrame(() => {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start((finished) => {
            if (finished) {
              currentTranslateY.current = 0;
            }
          });
        });
      });
    } else {
      setSearchQuery('');
      // Reset to bottom when hidden
      translateY.setValue(SCREEN_HEIGHT);
      currentTranslateY.current = SCREEN_HEIGHT;
      translateY.setOffset(0);
      translateY.flattenOffset();
    }
  }, [visible]);

  // Track if there was actual movement (to distinguish tap from drag)
  const hasMoved = useRef(false);

  // PanResponder for swipe down to close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        hasMoved.current = false;
        // Stop any ongoing animations first
        translateY.stopAnimation();
        // Set offset to current position and reset value
        translateY.setOffset(currentTranslateY.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Mark that we've moved
        if (Math.abs(gestureState.dy) > 5) {
          hasMoved.current = true;
        }
        // Only allow downward movement - follow finger smoothly
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        } else {
          // Allow slight upward movement for better feel
          translateY.setValue(gestureState.dy * 0.3);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();

        // Check if it was a tap (no significant movement)
        const totalDistance = Math.abs(gestureState.dy);
        const isTap = !hasMoved.current && totalDistance < 10;

        // Only close if it was a drag (not a tap) and meets threshold
        if (!isTap && (gestureState.dy > 150 || gestureState.vy > 0.7)) {
          // Smoothly animate to close
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else if (!isTap) {
          // Snap back to top if it was a drag but didn't meet threshold
          Animated.spring(translateY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        } else {
          // It was a tap, just reset position smoothly
          Animated.spring(translateY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleSelectType = (type: MaterialType) => {
    handleClose();
    // Delay callback to allow animation to complete (400ms to match animation duration)
    setTimeout(() => {
      onSelectType(type);
    }, 400);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Handle web search - could trigger website type
      handleSelectType('website');
    }
  };

  const materialOptions = [
    { type: 'pdf' as MaterialType, iconName: 'description' as const, iconSet: 'MaterialIcons' as const, label: 'PDF' },
    { type: 'audio' as MaterialType, iconName: 'equalizer' as const, iconSet: 'MaterialIcons' as const, label: 'Audio' },
    { type: 'image' as MaterialType, iconName: 'image' as const, iconSet: 'MaterialIcons' as const, label: 'Image' },
    { type: 'website' as MaterialType, iconName: 'globe' as const, iconSet: 'Ionicons' as const, label: 'Website' },
    { type: 'youtube' as MaterialType, iconName: 'logo-youtube' as const, iconSet: 'Ionicons' as const, label: 'YouTube' },
    { type: 'copied-text' as MaterialType, iconName: 'assignment' as const, iconSet: 'MaterialIcons' as const, label: 'Copied text' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.container} pointerEvents="box-none">
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* Sheet - 85% of screen height */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SCREEN_HEIGHT * 0.85,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            {/* Handle bar */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Close Button */}
            <View style={styles.closeButtonContainer}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#171717" />
              </TouchableOpacity>
            </View>

            {/* Content - Dismiss keyboard on tap outside */}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.contentWrapper}>
                {/* Title */}
                <View style={styles.header}>
                  <Text style={styles.title}>Create study notebooks</Text>
                  <Text style={styles.titleSubtext}>
                    <Text style={styles.titleHighlight}>from</Text>{' '}
                    <Text style={styles.titleHighlight2}>your materials</Text>
                  </Text>
                </View>

                {/* Search Input */}
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Find sources from the web"
                    placeholderTextColor="#A3A3A3"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    onPress={handleSearch}
                    style={[
                      styles.sendButton,
                      !searchQuery.trim() && styles.sendButtonDisabled,
                    ]}
                    disabled={!searchQuery.trim()}
                  >
                    <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Separator */}
                <View style={styles.separatorContainer}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>Or upload your files</Text>
                  <View style={styles.separatorLine} />
                </View>

                {/* Material Type Options */}
                <View style={styles.optionsContainer}>
                  {materialOptions.map((option) => (
                    <TouchableOpacity
                      key={option.type}
                      style={styles.optionButton}
                      onPress={() => handleSelectType(option.type)}
                      activeOpacity={0.7}
                    >
                      {option.iconSet === 'Ionicons' ? (
                        <Ionicons 
                          name={option.iconName as any} 
                          size={20} 
                          color="#171717" 
                          style={styles.buttonIcon}
                        />
                      ) : (
                        <MaterialIcons 
                          name={option.iconName as any} 
                          size={20} 
                          color="#171717" 
                          style={styles.buttonIcon}
                        />
                      )}
                      <Text style={styles.buttonLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    minHeight: SCREEN_HEIGHT * 0.85,
  },
  contentWrapper: {
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2.5,
  },
  closeButtonContainer: {
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingRight: 16,
    paddingBottom: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 4,
  },
  titleSubtext: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  titleHighlight: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  titleHighlight2: {
    color: '#34D399',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#171717',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  separatorText: {
    fontSize: 14,
    color: '#737373',
    fontWeight: '500',
  },
  optionsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#171717',
  },
});
