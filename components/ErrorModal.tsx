/**
 * Error Modal Component
 * Full-screen or modal overlay for critical/high severity errors
 */

import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppError } from '@/lib/errors/AppError';
import { RecoveryAction } from '@/lib/errors/types';
import { getThemeColors } from '@/lib/ThemeContext';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';

interface ErrorModalProps {
  error: AppError;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ error, onDismiss, onRetry }) => {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const router = useRouter();
  const userDisplay = error.toUserDisplay();

  const handleAction = () => {
    switch (error.recoveryAction) {
      case RecoveryAction.RETRY:
        onRetry?.();
        break;
      case RecoveryAction.LOGIN:
        onDismiss();
        router.replace('/auth');
        break;
      case RecoveryAction.UPGRADE:
        onDismiss();
        // Note: Upgrade/subscription screen not yet implemented
        // For now, show a message - can be updated when upgrade screen is added
        // router.push('/upgrade');
        break;
      case RecoveryAction.REFRESH:
        onDismiss();
        // Refresh current screen by reloading
        if (router.canGoBack()) {
          router.back();
          // Small delay to ensure back navigation completes before potential refresh
          setTimeout(() => {
            // Force a re-render by navigating to current route
            // This is a simple refresh mechanism
          }, 100);
        } else {
          // If can't go back, reload the app (extreme case)
          // In most cases, the error context will handle retry
        }
        break;
      default:
        onDismiss();
    }
  };

  const getSeverityColor = () => {
    switch (error.severity) {
      case 'critical':
        return '#dc2626'; // red-600
      case 'high':
        return '#ea580c'; // orange-600
      default:
        return '#ca8a04'; // yellow-600
    }
  };

  const getSeverityIcon = () => {
    switch (error.severity) {
      case 'critical':
        return 'alert-circle';
      case 'high':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
        <SafeAreaView style={styles.container}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header with icon */}
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: getSeverityColor() }]}>
                <Ionicons
                  name={getSeverityIcon()}
                  size={32}
                  color="white"
                />
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onDismiss}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>
              {userDisplay.title}
            </Text>

            {/* Message */}
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {userDisplay.message}
            </Text>

            {/* Action buttons */}
            <View style={styles.actions}>
              {userDisplay.actionLabel && (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={handleAction}
                >
                  <Ionicons
                    name={
                      error.recoveryAction === RecoveryAction.RETRY ? 'refresh' :
                      error.recoveryAction === RecoveryAction.LOGIN ? 'log-in' :
                      error.recoveryAction === RecoveryAction.UPGRADE ? 'arrow-up-circle' :
                      'refresh-circle'
                    }
                    size={20}
                    color={colors.white}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                    {userDisplay.actionLabel}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={onDismiss}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  {error.severity === 'critical' ? 'Close App' : 'Dismiss'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Nunito-Bold',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: 'Nunito-Regular',
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Nunito-Medium',
  },
});

