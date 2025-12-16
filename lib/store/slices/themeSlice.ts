/**
 * Theme Slice - Manages app theme (light/dark mode)
 * Supports system preference, manual light, and manual dark modes
 */

import type { StateCreator } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeSlice {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const createThemeSlice: StateCreator<ThemeSlice> = (set) => ({
  themeMode: 'system', // Default to system preference
  setThemeMode: (mode) => set({ themeMode: mode }),
});













