/**
 * Tests for authSlice
 */

import { create } from 'zustand';
import { createAuthSlice, type AuthSlice } from '@/lib/store/slices/authSlice';
import type { SupabaseUser } from '@/lib/store/types';

describe('authSlice', () => {
  let useAuthStore: ReturnType<typeof create<AuthSlice>>;

  beforeEach(() => {
    useAuthStore = create<AuthSlice>()(createAuthSlice);
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
      const mockUser: SupabaseUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        confirmation_sent_at: null,
        recovery_sent_at: null,
        email_change_sent_at: null,
        new_email: null,
        invited_at: null,
        action_link: null,
        phone: null,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      };

      useAuthStore.getState().setAuthUser(mockUser);

      expect(useAuthStore.getState().authUser).toEqual(mockUser);
    });

    it('should set auth user to null', () => {
      const mockUser: SupabaseUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        confirmation_sent_at: null,
        recovery_sent_at: null,
        email_change_sent_at: null,
        new_email: null,
        invited_at: null,
        action_link: null,
        phone: null,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      };

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
      const mockUser: SupabaseUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        confirmation_sent_at: null,
        recovery_sent_at: null,
        email_change_sent_at: null,
        new_email: null,
        invited_at: null,
        action_link: null,
        phone: null,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      };

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


