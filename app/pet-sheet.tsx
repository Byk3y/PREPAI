/**
 * Pet Half-Sheet Modal - TikTok style
 * Shows pet with gradient background, streak, XP, and missions
 * 
 * REFACTORED: Now uses modular components for better maintainability
 */

import React, { useRef, useState } from 'react';
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
  StreakBadges,
} from '@/components/pet-sheet';
import { usePetTasks } from '@/hooks/usePetTasks';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PetSheetScreen() {
  const router = useRouter();
  const { user, petState, updatePetName } = useStore();
  const scrollY = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Derive stage from petState (automatically calculated from points)
  // Clamp to valid stage range for UI (1-2 for now, since we only have assets for stages 1-2)
  const currentStage = Math.min(Math.max(petState.stage, 1), 2) as 1 | 2;

  // Local state for previewing next/previous stage (UI preview only, doesn't change actual stage)
  const [previewStage, setPreviewStage] = useState<1 | 2>(currentStage);

  // Update preview stage when actual stage changes
  React.useEffect(() => {
    setPreviewStage(currentStage);
  }, [currentStage]);

  // Gesture handling hook
  const { translateY, handleBarPanResponder, contentPanResponder, dismiss } = usePetSheetGestures({
    onDismiss: () => router.back(),
    scrollY,
  });

  // Pet growth missions - includes both foundational and daily tasks
  const { allTasks, taskProgress, foundationalTasks, loadDailyTasks, loadFoundationalTasks, checkAndAwardTask } = usePetTasks();

  // Refresh on mount to ensure we have latest data
  React.useEffect(() => {
    loadDailyTasks();
    loadFoundationalTasks();
  }, []);

  // REMOVED: Auto-check for name_pet task
  // This was causing issues because it ran before pet state was fully loaded from database
  // The task should only be awarded when user actually changes the name via updatePetName
  // The server-side validation in award_task_points will handle checking if the name is valid

  const handleNameChange = async (newName: string) => {
    // Use updatePetName instead of setPetState to trigger task completion check
    await updatePetName(newName);
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
            colors={previewStage === 1 ? ['#FFE082', '#FFFFFF'] : ['#FFB74D', '#FFFFFF']}
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
                  <PetDisplay
                    streak={user.streak}
                    stage={previewStage}
                    onNextStage={previewStage === 1 ? () => setPreviewStage(2) : undefined}
                    onPrevStage={previewStage === 2 ? () => setPreviewStage(1) : undefined}
                  />
                </View>

                {/* Bottom Section - Swipeable (includes pet name, XP, missions, and stats) */}
                <View style={styles.bottomSection} {...contentPanResponder.panHandlers}>
                  <PetInfo
                    name={petState.name}
                    points={petState.points}
                    onNameChange={handleNameChange}
                  />

                  <MissionsList
                    missions={allTasks}
                    taskProgress={taskProgress}
                    activeColor={previewStage === 1 ? '#FBBF24' : '#FB923C'} // Gold for Stage 1, Orange for Stage 2
                  />

                  <StreakBadges streak={user.streak} />
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
