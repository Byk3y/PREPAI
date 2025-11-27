/**
 * Pet Half-Sheet Modal - TikTok style
 * Shows pet with gradient background, streak, XP, and missions
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiViewCompat as MotiView } from '@/components/MotiViewCompat';
import { useStore } from '@/lib/store';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PetSheetScreen() {
  const router = useRouter();
  const { user, petState, setPetState } = useStore();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scrollY = useRef(0); // Track scroll position
  const scrollViewRef = useRef<ScrollView>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [petNameInput, setPetNameInput] = useState(petState.name);

  // Sync input when pet name changes externally
  useEffect(() => {
    if (!isEditingName) {
      setPetNameInput(petState.name);
    }
  }, [petState.name, isEditingName]);

  // Start animation immediately on mount - no delay
  useEffect(() => {
    // Reset scroll position to top
    scrollY.current = 0;
    
    // Set initial position
    translateY.setValue(SCREEN_HEIGHT);
    
    // Start animation immediately on next frame
    requestAnimationFrame(() => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Force scroll reset after layout is complete to ensure consistent bottomless appearance
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }, 100);
      });
    });
  }, []);

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

  // Track if there was actual movement (to distinguish tap from drag)
  const hasMoved = useRef(false);

  // PanResponder for handle bar - always draggable
  const handleBarPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        hasMoved.current = false;
        translateY.stopAnimation();
        translateY.setOffset(currentTranslateY.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dy) > 5) {
          hasMoved.current = true;
        }
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        } else {
          translateY.setValue(gestureState.dy * 0.3);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        const totalDistance = Math.abs(gestureState.dy);
        const isTap = !hasMoved.current && totalDistance < 10;

        if (!isTap && (gestureState.dy > 150 || gestureState.vy > 0.7)) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            router.back();
          });
        } else if (!isTap) {
          Animated.spring(translateY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        } else {
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

  // PanResponder for bottom section - only when scrolled to top
  const bottomSectionPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // Allow PanResponder to start when at top, but we'll filter in onMove
        const isAtTop = scrollY.current <= 10;
        return isAtTop;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only take over if it's a downward gesture
        // This prevents interfering with upward scrolling
        const isDownward = gestureState.dy > 5;
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.0;
        
        return isDownward && isVertical;
      },
      onPanResponderGrant: () => {
        hasMoved.current = false;
        translateY.stopAnimation();
        translateY.setOffset(currentTranslateY.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only move sheet if it's downward - ignore upward movements
        if (gestureState.dy <= 0) {
          // Upward movement - don't interfere, let ScrollView handle it
          return;
        }
        
        if (Math.abs(gestureState.dy) > 5) {
          hasMoved.current = true;
        }
        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        const totalDistance = Math.abs(gestureState.dy);
        const isTap = !hasMoved.current && totalDistance < 10;

        if (!isTap && (gestureState.dy > 150 || gestureState.vy > 0.7)) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            router.back();
          });
        } else if (!isTap) {
          Animated.spring(translateY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        } else {
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

  // Pet growth missions - TODO: Move to store when implementing real missions
  const missions = [
    { id: '1', title: 'Complete 5 flashcards', progress: 3, total: 5, reward: 50, completed: false },
    { id: '2', title: 'Study for 30 minutes', progress: 20, total: 30, reward: 30, completed: false },
    { id: '3', title: 'Maintain 7-day streak', progress: user.streak, total: 7, reward: 100, completed: user.streak >= 7 },
  ];

  const handleClose = () => {
    // Slide down sheet
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      router.back();
    });
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.container} pointerEvents="box-none">
        {/* Backdrop - transparent to prevent showing through rounded corners */}
        <Pressable 
          style={styles.backdrop}
          onPress={handleClose}
        />
        
        {/* Sheet - 85% of screen height */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SCREEN_HEIGHT * 0.85,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.safeArea}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              bounces={false}
              alwaysBounceVertical={false}
              contentContainerStyle={styles.scrollContent}
              scrollEventThrottle={16}
              nestedScrollEnabled={false}
              removeClippedSubviews={false}
              onScroll={(event) => {
                scrollY.current = event.nativeEvent.contentOffset.y;
              }}
              onScrollEndDrag={(event) => {
                scrollY.current = event.nativeEvent.contentOffset.y;
              }}
              onMomentumScrollEnd={(event) => {
                scrollY.current = event.nativeEvent.contentOffset.y;
              }}
            >
              {/* Handle bar - Swipe down enabled */}
              <View style={styles.handleContainer} {...handleBarPanResponder.panHandlers}>
                <View style={styles.handle} />
              </View>

              {/* Top Section - No swipe down (only streak and pet emoji) */}
              <View style={styles.topSection}>
                {/* Pet Display Section - Light Gray/Lavender Background */}
                <View style={styles.petSection}>
                  {/* Streak Days */}
                  <View style={styles.streakContainer}>
                    <Text style={styles.streakLabel}>Streak days</Text>
                    <Text style={styles.streakValue}>{user.streak}</Text>
                  </View>

                  {/* Pet Character */}
                  <View style={styles.petCharacterContainer}>
                    <MotiView
                      from={{ scale: 1 }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{
                        type: 'timing',
                        duration: 2000,
                        loop: true,
                        repeatReverse: true,
                      }}
                      style={styles.petEmojiContainer}
                    >
                      <Text style={styles.petEmoji}>🐾</Text>
                    </MotiView>
                  </View>
                </View>
              </View>

              {/* Bottom Section - Swipe down enabled (includes pet name, XP, missions, stats) */}
              <View style={styles.bottomSection} {...bottomSectionPanResponder.panHandlers}>
                {/* Pet Name and XP (part of swipeable area) */}
                <View style={styles.petSection}>
                  <View style={styles.petCharacterContainer}>
                    {/* Pet Name with Edit Icon */}
                    <View style={styles.petNameContainer}>
                      {isEditingName ? (
                        <TextInput
                          style={styles.petNameInput}
                          value={petNameInput}
                          onChangeText={setPetNameInput}
                          onBlur={() => {
                            if (petNameInput.trim()) {
                              setPetState({ name: petNameInput.trim() });
                            } else {
                              setPetNameInput(petState.name);
                            }
                            setIsEditingName(false);
                          }}
                          onSubmitEditing={() => {
                            if (petNameInput.trim()) {
                              setPetState({ name: petNameInput.trim() });
                            } else {
                              setPetNameInput(petState.name);
                            }
                            setIsEditingName(false);
                          }}
                          autoFocus
                          maxLength={20}
                        />
                      ) : (
                        <>
                          <Text style={styles.petName}>{petState.name}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              setPetNameInput(petState.name);
                              setIsEditingName(true);
                            }}
                            style={styles.editIconButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Text style={styles.editIcon}>✏️</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>

                    {/* XP Progress Bar */}
                    <View style={styles.xpContainer}>
                      <View style={styles.xpBarBackground}>
                        <MotiView
                          from={{ width: 0 }}
                          animate={{
                            width: `${(petState.xp / petState.xpToNext) * 100}%`,
                          }}
                          transition={{ type: 'timing', duration: 500 }}
                          style={[styles.xpBarFill, { width: `${(petState.xp / petState.xpToNext) * 100}%` }]}
                        />
                      </View>
                      <Text style={styles.xpText}>
                        {petState.xpToNext - petState.xp} points to unlock the next look
                      </Text>
                    </View>
                  </View>
                </View>
                {/* Missions Section - White Card */}
                <View style={styles.missionsSection}>
                  <Text style={styles.missionsTitle}>Grow your Pet</Text>

                  {missions.map((mission) => (
                    <View key={mission.id} style={styles.missionItem}>
                      <View
                        style={[
                          styles.checkbox,
                          mission.completed ? styles.checkboxCompleted : styles.checkboxIncomplete,
                        ]}
                      >
                        {mission.completed && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>

                      <View style={styles.missionInfo}>
                        <Text style={styles.missionTitle}>{mission.title}</Text>
                        <Text style={styles.missionReward}>
                          +{mission.reward} growth points
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Stats Section - White Card */}
                <View style={styles.statsSection}>
                  <Text style={styles.statsTitle}>Stats</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{user.coins}</Text>
                      <Text style={styles.statLabel}>Coins</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{petState.level}</Text>
                      <Text style={styles.statLabel}>Level</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{user.streak}</Text>
                      <Text style={styles.statLabel}>Streak</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
            <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']} />
          </View>
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
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E5E1F5',
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
    backgroundColor: '#E5E1F5',
  },
  bottomSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 0,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#E5E1F5',
    minHeight: 32,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2.5,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#E5E1F5',
    overflow: 'visible',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  topSection: {
    // Only streak and pet emoji - not swipeable
  },
  bottomSection: {
    // Swipeable area - includes pet name, XP, missions, and stats
  },
  petSection: {
    backgroundColor: '#E5E1F5',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    marginBottom: 12,
  },
  streakContainer: {
    marginBottom: 12,
  },
  streakLabel: {
    fontSize: 15,
    color: '#000000',
    marginBottom: 4,
    fontWeight: '500',
  },
  streakValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: -2,
  },
  petCharacterContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  petEmojiContainer: {
    width: 192,
    height: 192,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  petEmoji: {
    fontSize: 144,
  },
  petNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  petName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
  },
  editIconButton: {
    padding: 4,
    marginLeft: 8,
  },
  editIcon: {
    fontSize: 18,
  },
  petNameInput: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#9370DB',
    paddingVertical: 4,
    minWidth: 100,
  },
  xpContainer: {
    width: 256,
  },
  xpBarBackground: {
    height: 10,
    backgroundColor: '#C8B7E8',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#9370DB',
    borderRadius: 5,
  },
  xpText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
  },
  missionsSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  missionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 16,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#F97316',
  },
  checkboxIncomplete: {
    backgroundColor: '#FFEDD5',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
  },
  missionInfo: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 16,
    color: '#171717',
    marginBottom: 4,
  },
  missionReward: {
    fontSize: 14,
    color: '#EA580C',
    fontWeight: '600',
  },
  statsSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 0,
    marginTop: 0,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#262626',
  },
  statLabel: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
  },
});
