/**
 * Error Notification Context
 * Provides global error notification state and methods for displaying errors
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AppError } from '@/lib/errors/AppError';
import { ErrorSeverity } from '@/lib/errors/types';
import { ErrorNotificationBridge } from '@/components/ErrorNotificationBridge';

interface ErrorNotification {
  id: string;
  error: AppError;
  timestamp: number;
}

interface ErrorNotificationContextValue {
  // Show error notification (toast or modal based on severity)
  showError: (error: AppError) => void;
  
  // Show toast notification (non-blocking)
  showToast: (error: AppError) => void;
  
  // Show modal error (blocking)
  showModal: (error: AppError) => void;
  
  // Current notifications
  toasts: ErrorNotification[];
  currentModal: ErrorNotification | null;
  
  // Dismiss methods
  dismissToast: (id: string) => void;
  dismissModal: () => void;
  
  // Clear all
  clearAll: () => void;
}

export const ErrorNotificationContext = createContext<ErrorNotificationContextValue | null>(null);

export const useErrorNotification = () => {
  const context = useContext(ErrorNotificationContext);
  if (!context) {
    throw new Error('useErrorNotification must be used within ErrorNotificationProvider');
  }
  return context;
};

interface ErrorNotificationProviderProps {
  children: React.ReactNode;
}

export const ErrorNotificationProvider: React.FC<ErrorNotificationProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ErrorNotification[]>([]);
  const [currentModal, setCurrentModal] = useState<ErrorNotification | null>(null);
  const toastIdCounter = useRef(0);

  const generateId = useCallback(() => {
    return `error-${Date.now()}-${toastIdCounter.current++}`;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((error: AppError) => {
    const notification: ErrorNotification = {
      id: generateId(),
      error,
      timestamp: Date.now(),
    };

    setToasts((prev) => {
      // Limit to 3 toasts max
      const newToasts = [...prev, notification];
      return newToasts.slice(-3);
    });

    // Auto-dismiss after delay based on severity
    const dismissDelay = 
      error.severity === ErrorSeverity.LOW ? 3000 :
      error.severity === ErrorSeverity.MEDIUM ? 5000 :
      error.severity === ErrorSeverity.HIGH ? 7000 :
      4000;

    setTimeout(() => {
      dismissToast(notification.id);
    }, dismissDelay);
  }, [generateId, dismissToast]);

  const showModal = useCallback((error: AppError) => {
    const notification: ErrorNotification = {
      id: generateId(),
      error,
      timestamp: Date.now(),
    };

    setCurrentModal(notification);
  }, [generateId]);

  const showError = useCallback((error: AppError) => {
    // Route to appropriate display based on severity
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        // Blocking errors get modal
        showModal(error);
        break;
      case ErrorSeverity.MEDIUM:
      case ErrorSeverity.LOW:
        // Non-blocking errors get toast
        showToast(error);
        break;
      default:
        showToast(error);
    }
  }, [showToast, showModal]);

  const dismissModal = useCallback(() => {
    setCurrentModal(null);
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
    setCurrentModal(null);
  }, []);

  // Register bridge for ErrorBoundary (which is outside this provider)
  useEffect(() => {
    ErrorNotificationBridge.register(showError);
    return () => {
      ErrorNotificationBridge.unregister();
    };
  }, [showError]);

  const value: ErrorNotificationContextValue = {
    showError,
    showToast,
    showModal,
    toasts,
    currentModal,
    dismissToast,
    dismissModal,
    clearAll,
  };

  return (
    <ErrorNotificationContext.Provider value={value}>
      {children}
    </ErrorNotificationContext.Provider>
  );
};

