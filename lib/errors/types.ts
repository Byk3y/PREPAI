/**
 * Error Types and Enums for Centralized Error Handling
 */

export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  QUOTA = 'quota',
  PROCESSING = 'processing',
  PERMISSION = 'permission',
  STORAGE = 'storage',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',      // Silent, recoverable (e.g., network retry)
  MEDIUM = 'medium', // User notification, non-blocking
  HIGH = 'high',    // Block user action, requires attention
  CRITICAL = 'critical' // App-breaking, immediate intervention needed
}

export enum RecoveryAction {
  RETRY = 'retry',
  LOGIN = 'login',
  UPGRADE = 'upgrade',
  REFRESH = 'refresh',
  NONE = 'none'
}

export interface ErrorContext {
  userId?: string;
  operation: string;
  component?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  userAgent?: string;
  retryCount?: number;
  sessionId?: string;
}

export interface UserFriendlyMessage {
  title: string;
  message: string;
  actionLabel?: string;
  actionType?: RecoveryAction;
}










