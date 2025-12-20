import React from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppError } from './AppError';
import { RecoveryAction } from './types';
import { getThemeColors } from '@/lib/ThemeContext';
import { useTheme } from '@/lib/ThemeContext';

/**
 * User-friendly error display component
 */
export function UserErrorDisplay({
  error,
  onRetry,
  onDismiss
}: {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const userDisplay = error.toUserDisplay();

  const handleAction = () => {
    switch (error.recoveryAction) {
      case RecoveryAction.RETRY:
        onRetry?.();
        break;
      case RecoveryAction.LOGIN:
        // Note: UserErrorDisplay is used in contexts where router may not be available
        // For now, show alert - components using ErrorModal will handle navigation
        Alert.alert('Login Required', 'Please sign in to continue');
        break;
      case RecoveryAction.UPGRADE:
        // Note: Upgrade screen not yet implemented
        Alert.alert('Upgrade Required', 'Please upgrade your plan to continue');
        break;
      case RecoveryAction.REFRESH:
        // Note: Refresh logic handled by ErrorModal which has router access
        Alert.alert('Refresh', 'Please refresh to continue');
        break;
      default:
        onDismiss?.();
    }
  };

  const getActionIcon = () => {
    switch (error.recoveryAction) {
      case RecoveryAction.RETRY:
        return 'refresh';
      case RecoveryAction.LOGIN:
        return 'log-in';
      case RecoveryAction.UPGRADE:
        return 'arrow-up-circle';
      case RecoveryAction.REFRESH:
        return 'refresh-circle';
      default:
        return 'close-circle';
    }
  };

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      margin: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      {/* Header with icon and title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: getSeverityColor(error.severity, isDarkMode),
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}>
          <Ionicons
            name={getSeverityIcon(error.severity)}
            size={16}
            color="white"
          />
        </View>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: colors.text,
          flex: 1,
        }}>
          {userDisplay.title}
        </Text>
      </View>

      {/* Message */}
      <Text style={{
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 16,
      }}>
        {userDisplay.message}
      </Text>

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {userDisplay.actionLabel && (
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
            onPress={handleAction}
          >
            <Ionicons name={getActionIcon()} size={16} color={colors.white} />
            <Text style={{
              color: colors.white,
              fontSize: 14,
              fontWeight: '500',
            }}>
              {userDisplay.actionLabel}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onDismiss}
        >
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Toast-style error notification
 */
export function ErrorToast({
  error,
  onRetry,
  onDismiss,
  autoHide = true
}: {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  autoHide?: boolean;
}) {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const userDisplay = error.toUserDisplay();

  React.useEffect(() => {
    if (autoHide && !userDisplay.actionLabel) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [autoHide, userDisplay.actionLabel, onDismiss]);

  return (
    <View style={{
      position: 'absolute',
      top: 50,
      left: 16,
      right: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 5,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: getSeverityColor(error.severity, isDarkMode),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons
          name={getSeverityIcon(error.severity)}
          size={12}
          color="white"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: colors.text,
          marginBottom: 2,
        }}>
          {userDisplay.title}
        </Text>
        <Text style={{
          fontSize: 12,
          color: colors.textSecondary,
        }}>
          {userDisplay.message}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {userDisplay.actionLabel && onRetry && (
          <TouchableOpacity
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
            onPress={onRetry}
          >
            <Text style={{
              color: colors.primary,
              fontSize: 12,
              fontWeight: '500',
            }}>
              {userDisplay.actionLabel}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
          onPress={onDismiss}
        >
          <Ionicons name="close" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Helper functions
function getSeverityColor(severity: string, isDarkMode: boolean): string {
  switch (severity) {
    case 'critical':
      return '#dc2626'; // red-600
    case 'high':
      return '#ea580c'; // orange-600
    case 'medium':
      return '#ca8a04'; // yellow-600
    case 'low':
    default:
      return '#16a34a'; // green-600
  }
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'alert-circle';
    case 'high':
      return 'warning';
    case 'medium':
      return 'information-circle';
    case 'low':
    default:
      return 'checkmark-circle';
  }
}






