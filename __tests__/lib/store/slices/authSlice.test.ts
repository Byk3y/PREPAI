/**
 * Tests for authSlice
 */

import { create } from 'zustand';
import { createAuthSlice, type AuthSlice } from '@/lib/store/slices/authSlice';
import type { SupabaseUser } from '@/lib/store/types';

// Helper to create a mock user with minimal required properties
const createMockUser = (overrides: Partial<SupabaseUser> = {}): SupabaseUser => ({
  id: 'user-123',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  role: 'authenticated',
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('authSlice', () => {
  let useAuthStore: { getState: () => AuthSlice };

  beforeEach(() => {
    useAuthStore = create<AuthSlice>(createAuthSlice as any);
  });

  describe('initial state', () => {
    it('should have null authUser initially', () => {
      const state = useAuthStore.getState();
      expect(state.authUser).toBeNull();
    });

    it('should have isInitialized as false initially', () => {
      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('setAuthUser', () => {
    it('should set auth user', () => {
      const mockUser = createMockUser();
      useAuthStore.getState().setAuthUser(mockUser);
      expect(useAuthStore.getState().authUser).toEqual(mockUser);
    });

    it('should set auth user to null', () => {
      const mockUser = createMockUser();
      useAuthStore.getState().setAuthUser(mockUser);
      expect(useAuthStore.getState().authUser).toEqual(mockUser);

      useAuthStore.getState().setAuthUser(null);
      expect(useAuthStore.getState().authUser).toBeNull();
    });
  });

  describe('setIsInitialized', () => {
    it('should set isInitialized to true', () => {
      useAuthStore.getState().setIsInitialized(true);
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });

    it('should set isInitialized to false', () => {
      useAuthStore.getState().setIsInitialized(true);
      useAuthStore.getState().setIsInitialized(false);
      expect(useAuthStore.getState().isInitialized).toBe(false);
    });
  });

  describe('integration', () => {
    it('should handle complete auth flow', () => {
      const mockUser = createMockUser();

      // Initialize
      useAuthStore.getState().setIsInitialized(true);
      expect(useAuthStore.getState().isInitialized).toBe(true);

      // Set user
      useAuthStore.getState().setAuthUser(mockUser);
      expect(useAuthStore.getState().authUser).toEqual(mockUser);

      // Logout
      useAuthStore.getState().setAuthUser(null);
      expect(useAuthStore.getState().authUser).toBeNull();
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });
  });
});
