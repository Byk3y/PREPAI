/**
 * Pet Half-Sheet Modal - TikTok style
 * Shows pet with gradient background, streak, XP, and missions
 * 
 * REFACTORED: Now uses modular components for better maintainability
 */

import React, { useRef } from 'react';
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { usePetSheetGestures } from '@/hooks/usePetSheetGestures';
import {
  PetSheetHeader,
  PetDisplay,
  PetInfo,
  MissionsList,
  StatsCard,
  type Mission,
} from '@/components/pet-sheet';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PetSheetScreen() {
  const router = useRouter();
  const { user, petState, setPetState } = useStore();
  const scrollY = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Gesture handling hook
  const { translateY, handleBarPanResponder, contentPanResponder, dismiss } = usePetSheetGestures({
    onDismiss: () => router.back(),
    scrollY,
  });

  // Pet growth missions - TODO: Move to store when implementing real missions
  const missions: Mission[] = [
    { id: '1', title: 'Complete 5 flashcards', progress: 3, total: 5, reward: 50, completed: false },
    { id: '2', title: 'Study for 30 minutes', progress: 20, total: 30, reward: 30, completed: false },
    { id: '3', title: 'Maintain 7-day streak', progress: user.streak, total: 7, reward: 100, completed: user.streak >= 7 },
  ];

  const handleNameChange = async (newName: string) => {
    await setPetState({ name: newName });
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent={true}
    >
      <View style={styles.container} pointerEvents="box-none">
        {/* Backdrop */}
        <Pressable
          style={styles.backdrop}
          onPress={dismiss}
        />

        {/* Sheet - 85% of screen height */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SCREEN_HEIGHT * 0.88,
              transform: [{ translateY }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FFE082', '#FFFFFF']}
            style={styles.gradient}
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
                <PetSheetHeader panHandlers={handleBarPanResponder.panHandlers} />

                <View style={styles.topSection}>
                  <PetDisplay streak={user.streak} />
                </View>

                {/* Bottom Section - Swipeable (includes pet name, XP, missions, and stats) */}
                <View style={styles.bottomSection} {...contentPanResponder.panHandlers}>
                  <PetInfo
                    name={petState.name}
                    xp={petState.xp}
                    xpToNext={petState.xpToNext}
                    onNameChange={handleNameChange}
                  />

                  <MissionsList missions={missions} />

                  <StatsCard
                    coins={user.coins}
                    level={petState.level}
                    streak={user.streak}
                  />
                </View>
              </ScrollView>
              <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']} />
            </View>
          </LinearGradient>
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
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
  },
  gradient: {
    flex: 1,
  },
  bottomSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 0,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
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
});
