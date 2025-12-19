/**
 * Tests for useAuthFlow hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useAuthFlow } from '@/hooks/useAuthFlow';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
    Warning: 'warning',
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      getUser: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

jest.mock('@/lib/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}));

// Alert is mocked in jest.setup.js
const { Alert } = require('react-native');
const mockAlert = Alert.alert;

describe('useAuthFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthFlow());

      expect(result.current.flowStep).toBe('email');
      expect(result.current.email).toBe('');
      expect(result.current.otpCode).toBe('');
      expect(result.current.firstName).toBe('');
      expect(result.current.lastName).toBe('');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('state setters', () => {
    it('should update email', () => {
      const { result } = renderHook(() => useAuthFlow());

      act(() => {
        result.current.setEmail('test@example.com');
      });

      expect(result.current.email).toBe('test@example.com');
    });

    it('should update OTP code', () => {
      const { result } = renderHook(() => useAuthFlow());

      act(() => {
        result.current.setOtpCode('123456');
      });

      expect(result.current.otpCode).toBe('123456');
    });

    it('should update first name', () => {
      const { result } = renderHook(() => useAuthFlow());

      act(() => {
        result.current.setFirstName('John');
      });

      expect(result.current.firstName).toBe('John');
    });

    it('should update last name', () => {
      const { result } = renderHook(() => useAuthFlow());

      act(() => {
        result.current.setLastName('Doe');
      });

      expect(result.current.lastName).toBe('Doe');
    });
  });

  describe('handleSendOTP', () => {
    it('should show alert if email is empty', async () => {
      const { result } = renderHook(() => useAuthFlow());

      await act(async () => {
        await result.current.handleSendOTP();
      });

      expect(mockAlert).toHaveBeenCalledWith('Invalid Email', expect.any(String));
      expect(Haptics.notificationAsync).toHaveBeenCalled();
    });

    it('should show alert if email is invalid', async () => {
      const { result } = renderHook(() => useAuthFlow());

      act(() => {
        result.current.setEmail('invalid-email');
      });

      await act(async () => {
        await result.current.handleSendOTP();
      });

      expect(mockAlert).toHaveBeenCalledWith('Invalid Email', expect.any(String));
    });

    it('should send OTP and transition to otp step on success', async () => {
      const { result } = renderHook(() => useAuthFlow());
      const { supabase } = require('@/lib/supabase');

      supabase.auth.signInWithOtp.mockResolvedValue({ error: null });

      act(() => {
        result.current.setEmail('test@example.com');
      });

      await act(async () => {
        await result.current.handleSendOTP();
      });

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { shouldCreateUser: true },
      });
      expect(result.current.flowStep).toBe('otp');
      expect(Haptics.notificationAsync).toHaveBeenCalled();
    });
  });

  describe('handleVerifyOTP', () => {
    it('should show alert if OTP is empty', async () => {
      const { result } = renderHook(() => useAuthFlow());

      await act(async () => {
        await result.current.handleVerifyOTP();
      });

      expect(mockAlert).toHaveBeenCalledWith('Error', expect.any(String));
    });

    it('should show alert if OTP is too short', async () => {
      const { result } = renderHook(() => useAuthFlow());

      act(() => {
        result.current.setOtpCode('123');
      });

      await act(async () => {
        await result.current.handleVerifyOTP();
      });

      expect(mockAlert).toHaveBeenCalledWith('Error', expect.any(String));
    });

    it('should transition to names step for new user without profile', async () => {
      const { result } = renderHook(() => useAuthFlow());
      const { supabase } = require('@/lib/supabase');

      supabase.auth.verifyOtp.mockResolvedValue({
        data: {
          session: { access_token: 'token' },
          user: { id: 'user-123' },
        },
        error: null,
      });

      const mockFrom = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // No profile found
        }),
      }));
      supabase.from = mockFrom;

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setOtpCode('123456');
      });

      await act(async () => {
        await result.current.handleVerifyOTP();
      });

      expect(result.current.flowStep).toBe('names');
    });
  });

  describe('handleSaveNames', () => {
    it('should show alert if first name is empty', async () => {
      const { result } = renderHook(() => useAuthFlow());

      await act(async () => {
        await result.current.handleSaveNames();
      });

      expect(mockAlert).toHaveBeenCalledWith('Invalid Name', expect.any(String));
    });

    it('should show alert if last name is empty', async () => {
      const { result } = renderHook(() => useAuthFlow());

      act(() => {
        result.current.setFirstName('John');
      });

      await act(async () => {
        await result.current.handleSaveNames();
      });

      expect(mockAlert).toHaveBeenCalledWith('Invalid Name', expect.any(String));
    });

    it('should show alert if first name contains @', async () => {
      const { result } = renderHook(() => useAuthFlow());

      act(() => {
        result.current.setFirstName('test@example.com');
        result.current.setLastName('Doe');
      });

      await act(async () => {
        await result.current.handleSaveNames();
      });

      expect(mockAlert).toHaveBeenCalledWith('Invalid Name', expect.any(String));
    });
  });

  describe('resetToEmail', () => {
    it('should reset to email step and clear form data', () => {
      const { result } = renderHook(() => useAuthFlow());

      act(() => {
        result.current.setEmail('test@example.com');
        result.current.setOtpCode('123456');
        result.current.setFirstName('John');
        result.current.setLastName('Doe');
      });

      act(() => {
        result.current.resetToEmail();
      });

      expect(result.current.flowStep).toBe('email');
      expect(result.current.otpCode).toBe('');
      expect(result.current.firstName).toBe('');
      expect(result.current.lastName).toBe('');
      expect(result.current.email).toBe('test@example.com'); // Email is preserved
    });
  });

  describe('handleSocialLogin', () => {
    it('should trigger OAuth flow for Google', async () => {
      const { result } = renderHook(() => useAuthFlow());
      const { supabase } = require('@/lib/supabase');

      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: {},
        error: null,
      });

      await act(async () => {
        await result.current.handleSocialLogin('google');
      });

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.any(String),
        },
      });
    });

    it('should trigger OAuth flow for Apple', async () => {
      const { result } = renderHook(() => useAuthFlow());
      const { supabase } = require('@/lib/supabase');

      supabase.auth.signInWithOAuth.mockResolvedValue({
        data: {},
        error: null,
      });

      await act(async () => {
        await result.current.handleSocialLogin('apple');
      });

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: {
          redirectTo: expect.any(String),
        },
      });
    });
  });
});
