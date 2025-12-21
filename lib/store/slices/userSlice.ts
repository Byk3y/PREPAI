/**
 * User slice - User profile state management with Supabase persistence
 */

import type { StateCreator } from 'zustand';
import { userService } from '@/lib/services/userService';
import type { User, SupabaseUser } from '../types';

export interface UserSlice {
  user: User;
  userProfileSyncedAt: number | null;
  userProfileUserId: string | null;
  flashcardsStudied: number;
  setUser: (user: Partial<User>) => void;
  loadUserProfile: () => Promise<void>;
  hydrateUserProfileFromCache: () => void;
  resetUserProfile: () => void;
  hasCreatedNotebook: boolean;
  setHasCreatedNotebook: (value: boolean) => void;
}

export const createUserSlice: StateCreator<
  UserSlice & { authUser: SupabaseUser | null },
  [],
  [],
  UserSlice
> = (set, get) => ({
  user: {
    id: '',
    name: '',
    first_name: '',
    last_name: '',
    streak: 0,
    coins: 0,
  },
  userProfileSyncedAt: null,
  userProfileUserId: null,
  flashcardsStudied: 0,
  setUser: (updates) =>
    set((state) => ({
      user: { ...state.user, ...updates },
    })),
  loadUserProfile: async () => {
    const { authUser } = get();
    if (!authUser) return;

    try {
      const profile = await userService.loadUserProfile(authUser.id);

      // Calculate flashcard completions count
      const flashcardsStudied = await userService.getFlashcardsStudiedCount(authUser.id);

      if (profile) {
        set({
          user: {
            ...profile,
            name: profile.name || authUser.email || 'User',
          },
          userProfileSyncedAt: Date.now(),
          userProfileUserId: authUser.id,
          flashcardsStudied,
        });
      } else {
        // No profile exists, use auth user data as fallback
        // Profile should be auto-created by trigger, but handle gracefully
        set({
          user: {
            id: authUser.id,
            name: authUser.email || 'User',
            first_name: '',
            last_name: '',
            streak: 0,
            coins: 0,
            avatar: undefined,
          },
          userProfileSyncedAt: Date.now(),
          userProfileUserId: authUser.id,
          flashcardsStudied,
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  },
  hydrateUserProfileFromCache: () => {
    const { authUser, userProfileUserId, user } = get();
    if (authUser && userProfileUserId === authUser.id && user.id === authUser.id) {
      // Cache matches current user, keep it
      // No need to set state as it's already there from hydration
    }
  },
  resetUserProfile: () => {
    set({
      user: {
        id: '',
        name: '',
        first_name: '',
        last_name: '',
        streak: 0,
        coins: 0,
      },
      userProfileSyncedAt: null,
      userProfileUserId: null,
      flashcardsStudied: 0,
    });
  },
  hasCreatedNotebook: false,
  setHasCreatedNotebook: (value) => set({ hasCreatedNotebook: value }),
});
