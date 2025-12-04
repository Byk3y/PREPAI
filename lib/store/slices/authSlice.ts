/**
 * Auth slice - Authentication state management
 */

import type { StateCreator } from 'zustand';
import type { SupabaseUser } from '../types';

export interface AuthSlice {
  authUser: SupabaseUser | null;
  setAuthUser: (user: SupabaseUser | null) => void;
  isInitialized: boolean;
  setIsInitialized: (value: boolean) => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  authUser: null,
  setAuthUser: (user) => set({ authUser: user }),
  isInitialized: false,
  setIsInitialized: (value) => set({ isInitialized: value }),
});
