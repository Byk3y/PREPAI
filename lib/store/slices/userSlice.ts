/**
 * User slice - User profile state management with Supabase persistence
 */

import type { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, streak, avatar_url')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error loading user profile:', error);
        return;
      }

      if (data) {
        set({
          user: {
            id: data.id,
            name: data.name || authUser.email || 'User',
            streak: data.streak || 0,
            coins: 0, // Not used in current system
            avatar: data.avatar_url || undefined,
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
