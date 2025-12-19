/**
 * Auth Flow Type Definitions
 */

import type { getThemeColors } from '@/lib/ThemeContext';

export type FlowStep = 'email' | 'otp' | 'names';

export interface ProfileMeta {
  has_completed_onboarding?: boolean;
  has_created_notebook?: boolean;
  onboarding_completed_at?: string;
  learning_style?: 'visual' | 'auditory' | 'reading' | 'practice';
  study_goal?: 'exam_prep' | 'retention' | 'quick_review' | 'all';
  daily_commitment_minutes?: number;
  commitment_made_at?: string;
  assessment_completed_at?: string;
  assessment_version?: string;
  [key: string]: any;
}

// Step component props
export interface EmailStepProps {
  email: string;
  onEmailChange: (email: string) => void;
  onSendOTP: () => void;
  onSocialLogin: (provider: 'google' | 'apple') => void;
  loading: boolean;
  colors: ReturnType<typeof getThemeColors>;
}

export interface OTPStepProps {
  otpCode: string;
  email: string;
  onOTPCodeChange: (code: string) => void;
  onVerifyOTP: () => void;
  onBackToEmail: () => void;
  loading: boolean;
  colors: ReturnType<typeof getThemeColors>;
}

export interface NamesStepProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (name: string) => void;
  onLastNameChange: (name: string) => void;
  onSaveNames: () => void;
  loading: boolean;
  colors: ReturnType<typeof getThemeColors>;
}

// Auth button props
export interface AuthButtonProps {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  colors: ReturnType<typeof getThemeColors>;
}

// Social auth buttons props
export interface SocialAuthButtonsProps {
  onSocialLogin: (provider: 'google' | 'apple') => void;
  colors: ReturnType<typeof getThemeColors>;
  disabled?: boolean;
}

// Auth flow hook state
export interface AuthFlowState {
  flowStep: FlowStep;
  email: string;
  otpCode: string;
  firstName: string;
  lastName: string;
  loading: boolean;
}

// Auth flow hook actions
export interface AuthFlowActions {
  setEmail: (email: string) => void;
  setOtpCode: (code: string) => void;
  setFirstName: (name: string) => void;
  setLastName: (name: string) => void;
  handleSendOTP: () => Promise<void>;
  handleVerifyOTP: () => Promise<void>;
  handleSaveNames: () => Promise<void>;
  handleSocialLogin: (provider: 'google' | 'apple') => Promise<void>;
  resetToEmail: () => void;
  cleanupStorage: () => Promise<void>;
}

// Combined hook return type
export type UseAuthFlowReturn = AuthFlowState & AuthFlowActions;
