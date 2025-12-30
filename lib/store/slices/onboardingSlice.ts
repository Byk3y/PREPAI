/**
 * Onboarding Slice - Manages onboarding state and completion
 */

import { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface OnboardingSlice {
  // State
  hasCompletedOnboarding: boolean;
  pendingPetName: string | null;
  currentOnboardingScreen: number;
  educationLevel: string | null;
  ageBracket: string | null;

  // Actions
  setHasCompletedOnboarding: (completed: boolean) => void;
  setPendingPetName: (name: string) => void;
  clearPendingPetName: () => void;
  setCurrentOnboardingScreen: (screen: number) => void;
  setEducationLevel: (level: string) => void;
  setAgeBracket: (bracket: string) => void;
  markOnboardingComplete: () => Promise<void>;
}

export const createOnboardingSlice: StateCreator<
  OnboardingSlice,
  [],
  [],
  OnboardingSlice
> = (set, get) => ({
  // Initial state
  hasCompletedOnboarding: false,
  pendingPetName: null,
  currentOnboardingScreen: 0,
  educationLevel: null,
  ageBracket: null,

  // Set completion status
  setHasCompletedOnboarding: (completed: boolean) => {
    set({ hasCompletedOnboarding: completed });
  },

  // Store pet name temporarily during onboarding (before user has account)
  setPendingPetName: (name: string) => {
    set({ pendingPetName: name });
  },

  // Clear pending pet name after it's been saved
  clearPendingPetName: () => {
    set({ pendingPetName: null });
  },

  // Track which screen user is on during onboarding
  setCurrentOnboardingScreen: (screen: number) => {
    set({ currentOnboardingScreen: screen });
  },

  setEducationLevel: (level: string) => {
    set({ educationLevel: level });
  },

  setAgeBracket: (bracket: string) => {
    set({ ageBracket: bracket });
  },

  // Mark onboarding as complete in database
  markOnboardingComplete: async () => {
    try {
      // Get auth user from store (assuming it's available in the combined store)
      const state = get() as any;
      const { educationLevel, ageBracket, authUser } = state;

      if (!authUser) {
        console.warn('Cannot mark onboarding complete: no auth user');
        return;
      }

      // Update profile meta in database using merge function to preserve existing meta fields
      const { error } = await (supabase.rpc as any)('merge_profile_meta', {
        p_user_id: authUser.id,
        p_new_meta: {
          has_completed_onboarding: true,
          onboarding_completed_at: new Date().toISOString(),
          education_level: educationLevel,
          age_bracket: ageBracket,
        },
      });

      if (error) {
        throw error;
      }

      // Update local state
      set({
        hasCompletedOnboarding: true,
        currentOnboardingScreen: 10, // Update to new last screen index
      });

      console.log('Onboarding marked as complete');
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
      throw error;
    }
  },
});
