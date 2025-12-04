/**
 * User slice - User profile state management
 */

import type { StateCreator } from 'zustand';
import type { User } from '../types';

export interface UserSlice {
  user: User;
  setUser: (user: Partial<User>) => void;
  hasCreatedNotebook: boolean;
  setHasCreatedNotebook: (value: boolean) => void;
}

export const createUserSlice: StateCreator<UserSlice> = (set) => ({
  user: {
    id: 'user-1',
    name: 'Alex',
    streak: 7,
    coins: 250,
  },
  setUser: (updates) =>
    set((state) => ({
      user: { ...state.user, ...updates },
    })),
  hasCreatedNotebook: false,
  setHasCreatedNotebook: (value) => set({ hasCreatedNotebook: value }),
});
