/**
 * Locked Notebook Overlay
 * Auto-dismissing overlay shown when user tries to access a locked notebook
 * Creates 2-3s friction before allowing access
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColors } from '@/lib/ThemeContext';
import { useTheme } from '@/lib/ThemeContext';
import { useUpgrade } from '@/lib/hooks/useUpgrade';

interface LockedNotebookOverlayProps {
  visible: boolean;
  totalNotebooks: number;
  notebookId?: string; // Notebook ID for tracking
  delayMs?: number; // Default: 2500ms
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function LockedNotebookOverlay({
  visible,
  totalNotebooks,
  notebookId,
  delayMs = 2500,
  onUpgrade,
  onDismiss,
}: LockedNotebookOverlayProps) {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const [countdown, setCountdown] = useState(Math.ceil(delayMs / 1000));
  const { trackLockedNotebookAccessed, trackUpgradeButtonClicked } = useUpgrade();

  useEffect(() => {
    if (visible) {
      // Track when locked notebook is accessed
      trackLockedNotebookAccessed(notebookId || 'unknown');
      
      // Reset countdown when modal becomes visible
      setCountdown(Math.ceil(delayMs / 1000));

      // Auto-dismiss timer
      const dismissTimer = setTimeout(() => {
        onDismiss();
      }, delayMs);

      // Countdown timer (updates every second)
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      return () => {
        clearTimeout(dismissTimer);
        clearInterval(countdownInterval);
      };
    }
  }, [visible, delayMs, onDismiss, trackLockedNotebookAccessed, notebookId]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
        <SafeAreaView style={styles.container}>
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Lock Icon */}
            <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="lock-closed" size={40} color="#FFFFFF" />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>
              Unlock all {totalNotebooks} notebooks
            </Text>

            {/* Message */}
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              Upgrade to Premium to access all your notebooks and unlock unlimited features.
            </Text>

            {/* Action button */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                trackUpgradeButtonClicked('locked_notebook_overlay');
                onUpgrade();
              }}
            >
              <Text style={styles.primaryButtonText}>Upgrade Now</Text>
            </TouchableOpacity>

            {/* Countdown text */}
            <Text style={[styles.countdown, { color: colors.textMuted }]}>
              Opening in {countdown}s...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

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
    padding: 32,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Nunito-Bold',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    fontFamily: 'Nunito-Regular',
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
    color: '#FFFFFF',
  },
  countdown: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    textAlign: 'center',
  },
});
