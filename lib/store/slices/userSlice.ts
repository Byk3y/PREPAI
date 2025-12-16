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
  setUser: (user: Partial<User>) => void;
  loadUserProfile: () => Promise<void>;
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
  setUser: (updates) =>
    set((state) => ({
      user: { ...state.user, ...updates },
    })),
  loadUserProfile: async () => {
    const { authUser } = get();
    if (!authUser) return;

    try {
      const profile = await userService.loadUserProfile(authUser.id);

      if (profile) {
        set({
          user: {
            ...profile,
            name: profile.name || authUser.email || 'User',
          },
          userProfileSyncedAt: Date.now(),
          userProfileUserId: authUser.id,
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
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  },
  hasCreatedNotebook: false,
  setHasCreatedNotebook: (value) => set({ hasCreatedNotebook: value }),
});
