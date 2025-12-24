/**
 * Onboarding Flow - Main Orchestrator
 * Coordinates 7 screens introducing Brigo's value proposition
 * Science-backed education leading to trial signup
 *
 * Modular architecture with separate screen components
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, BackHandler, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '@/lib/store';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

// Components
import { ProgressBar } from '@/components/onboarding/components/ProgressBar';
import { OnboardingButton } from '@/components/onboarding/components/OnboardingButton';

// Constants
import {
  SCREEN_INDICES,
  TOTAL_SCREENS,
  FIRST_SCREEN,
  LAST_SCREEN,
  AUTH_REQUIRED_SCREEN,
  ASSESSMENT_START_SCREEN,
  isLastScreen,
  isFirstScreen,
  shouldHideFooter,
  getNextScreen,
} from '@/lib/onboarding/constants';

// Screens
import { Screen1 } from '@/components/onboarding/screens/Screen1';
import { Screen2 } from '@/components/onboarding/screens/Screen2';
import { Screen3 } from '@/components/onboarding/screens/Screen3';
import { Screen4_Assessment } from '@/components/onboarding/screens/Screen4_Assessment';
import { Screen4_Results } from '@/components/onboarding/screens/Screen4_Results';
import { Screen4_PetNaming } from '@/components/onboarding/screens/Screen4_PetNaming';
import { Screen4_Notifications } from '@/components/onboarding/screens/Screen4_Notifications';
import { Screen5 } from '@/components/onboarding/screens/Screen5';
import { Screen6 } from '@/components/onboarding/screens/Screen6';
import { Screen7 } from '@/components/onboarding/screens/Screen7';

export default function OnboardingScreen() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [petName, setPetName] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const {
    setPendingPetName,
    setCurrentOnboardingScreen,
    markOnboardingComplete,
    currentOnboardingScreen: savedScreen,
    authUser,
    updatePetName,
    petState,
    loadPetState,
  } = useStore();

  // Load saved screen on mount if resuming after auth
  useEffect(() => {
    if (authUser && savedScreen >= ASSESSMENT_START_SCREEN && savedScreen < TOTAL_SCREENS) {
      console.log('Resuming onboarding at screen', savedScreen);
      setCurrentScreen(savedScreen);
    }
  }, [authUser, savedScreen]);

  // Load existing pet name when reaching pet naming screen
  useEffect(() => {
    // Only run when reaching pet naming screen and user is logged in
    if (currentScreen !== SCREEN_INDICES.SCREEN_4_PET_NAMING || !authUser) {
      return;
    }

    // Check if pet state is already loaded with a custom name
    if (petState.name && petState.name !== 'Nova' && petState.name.trim() !== '') {
      // Pet already has a custom name, pre-fill it only if input is empty
      // Use function update to avoid stale closure issues
      setPetName((current) => {
        return current.trim() === '' ? petState.name : current;
      });
      return;
    }

    // Load pet state from database if not already loaded or if it's default
    if (!petState.name || petState.name === 'Nova') {
      loadPetState()
        .then(() => {
          // After loading, get fresh state and check if pet has a custom name
          // Use getState() here because we're in an async callback and need a one-time read
          // See docs/ZUSTAND_GETSTATE_PATTERN.md for details
          const store = useStore.getState();
          const loadedName = store.petState.name;

          // Only set if we got a valid custom name
          if (loadedName && loadedName !== 'Nova' && loadedName.trim() !== '') {
            // Use function update to get the latest petName state
            // Only update if input is still empty (user might have typed while loading)
            setPetName((current) => {
              return current.trim() === '' ? loadedName : current;
            });
          }
        })
        .catch((error) => {
          console.error('Failed to load pet state:', error);
          // Silently fail - user can still enter a name manually
        });
    }
  }, [currentScreen, authUser, petState.name]);

  // Handle hardware back button on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (!isFirstScreen(currentScreen)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setCurrentScreen((prev) => prev - 1);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [currentScreen])
  );

  const handleContinue = async () => {
    if (isNavigating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Screen 3 (Solution) now has its own buttons, so this won't be called for it
    // But keeping the logic in case it's needed elsewhere

    // Pet Naming Screen - Save pet name before advancing
    if (currentScreen === SCREEN_INDICES.SCREEN_4_PET_NAMING) {
      const trimmedName = petName.trim();

      // Validate pet name is not empty
      if (!trimmedName) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return; // Don't advance if name is empty
      }

      setIsNavigating(true);
      let saveSuccess = false;

      try {
        if (authUser) {
          // User is logged in - save directly to database
          try {
            await updatePetName(trimmedName);
            console.log('Pet name saved to database:', trimmedName);
            saveSuccess = true;
          } catch (updateError) {
            // updatePetName might not throw, but setPetState inside it might fail
            // Check if the name was actually saved by verifying petState
            console.error('Error in updatePetName:', updateError);
            // Verify the save by checking if petState was updated
            // Use getState() here because we're in an error handler and need a one-time read
            // See docs/ZUSTAND_GETSTATE_PATTERN.md for details
            const store = useStore.getState();
            if (store.petState.name === trimmedName) {
              saveSuccess = true;
              console.log('Pet name verified in state:', trimmedName);
            } else {
              throw new Error('Pet name was not saved to state');
            }
          }
        } else {
          // User not logged in yet - save to pendingPetName (will be saved in callback.tsx after auth)
          setPendingPetName(trimmedName);
          console.log('Pet name saved to pendingPetName:', trimmedName);
          saveSuccess = true;
        }

        // Save progress for both logged-in and non-logged-in users
        // Use next screen index to ensure consistency
        const nextScreen = getNextScreen(currentScreen);
        setCurrentOnboardingScreen(nextScreen);

        // Only advance if save was successful
        if (saveSuccess) {
          setCurrentScreen(nextScreen);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          console.error('Failed to save pet name - not advancing');
        }
      } catch (error) {
        console.error('Failed to save pet name:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Don't advance if save failed - user should retry
        // This prevents losing the pet name they entered
      } finally {
        setIsNavigating(false);
      }
      return;
    }

    // Last screen - Mark complete and go home
    if (isLastScreen(currentScreen)) {
      setIsNavigating(true);
      try {
        await markOnboardingComplete();
        // Redirect to trial offer payment screen
        router.replace('/paywall?source=onboarding');
      } catch (error) {
        console.error('Failed to mark onboarding complete:', error);
        router.replace('/');
      }
      return;
    }

    // All other screens - just advance
    setCurrentScreen((prev) => prev + 1);
  };


  // Enhanced button text with commitment language
  const getContinueButtonText = () => {
    switch (currentScreen) {
      case SCREEN_INDICES.SCREEN_3_SOLUTION: // Auth break point
        return "Let's get started →";
      case SCREEN_INDICES.SCREEN_4_ASSESSMENT: // Handled internally by component
        return 'Continue →';
      case SCREEN_INDICES.SCREEN_4_RESULTS:
        return "Let's personalize my experience →";
      case SCREEN_INDICES.SCREEN_4_PET_NAMING:
        return "Meet my new mentor →";
      case SCREEN_INDICES.SCREEN_7_TRIAL_OFFER: // Last screen
        return "I'm ready to study smarter";
      default:
        return 'Continue →';
    }
  };

  const continueButtonText = getContinueButtonText();
  const isLastScreenValue = isLastScreen(currentScreen);

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case SCREEN_INDICES.SCREEN_1_PROBLEM:
        return <Screen1 colors={colors} />;
      case SCREEN_INDICES.SCREEN_2_SCIENCE:
        return <Screen2 colors={colors} />;
      case SCREEN_INDICES.SCREEN_3_SOLUTION:
        return <Screen3 colors={colors} onContinue={handleContinue} />;
      case SCREEN_INDICES.SCREEN_4_ASSESSMENT:
        return (
          <Screen4_Assessment
            colors={colors}
            onComplete={() => setCurrentScreen(SCREEN_INDICES.SCREEN_4_RESULTS)}
          />
        );
      case SCREEN_INDICES.SCREEN_4_RESULTS:
        return <Screen4_Results colors={colors} />;
      case SCREEN_INDICES.SCREEN_4_PET_NAMING:
        return <Screen4_PetNaming petName={petName} onNameChange={setPetName} colors={colors} />;
      case SCREEN_INDICES.SCREEN_4_NOTIFICATIONS:
        return (
          <Screen4_Notifications
            petName={petName}
            colors={colors}
            onDone={() => setCurrentScreen(SCREEN_INDICES.SCREEN_5_DREAM)}
          />
        );
      case SCREEN_INDICES.SCREEN_5_DREAM:
        return <Screen5 colors={colors} />;
      case SCREEN_INDICES.SCREEN_6_SOCIAL_PROOF:
        return <Screen6 colors={colors} />;
      case SCREEN_INDICES.SCREEN_7_TRIAL_OFFER:
        return <Screen7 colors={colors} />;
      default:
        return <Screen1 colors={colors} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Progress bar with milestones */}
      <ProgressBar
        current={currentScreen + 1}
        total={TOTAL_SCREENS}
        onBack={() => {
          if (!isFirstScreen(currentScreen)) {
            setCurrentScreen((prev) => prev - 1);
          }
        }}
      />

      {/* Current screen with animation */}
      <View style={styles.screenWrapper}>
        <MotiView
          key={currentScreen}
          from={{ opacity: 0, translateX: 50 }}
          animate={{ opacity: 1, translateX: 0 }}
          exit={{ opacity: 0, translateX: -50 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 } as any}
          style={styles.screenContent}
        >
          {renderScreen()}
        </MotiView>
      </View>

      {/* Navigation footer - hide for screens with their own navigation/buttons */}
      {!shouldHideFooter(currentScreen) && (
        <View style={styles.footer}>
          <OnboardingButton
            text={continueButtonText}
            onPress={handleContinue}
            variant={isLastScreenValue ? 'commitment' : 'primary'}
            disabled={isNavigating || (currentScreen === SCREEN_INDICES.SCREEN_4_PET_NAMING && !petName.trim())}
          />
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
  },
  screenContent: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
});
