/**
 * Error Notification Container
 * Renders toast notifications and modals from ErrorNotificationContext
 */

import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorNotificationContext } from '@/lib/contexts/ErrorNotificationContext';
import { ErrorToast } from '@/lib/errors/UserErrorDisplay';
import { ErrorModal } from './ErrorModal';

export const ErrorNotificationContainer: React.FC = () => {
  // Use useContext directly with safety check
  const context = useContext(ErrorNotificationContext);
  
  // If context is not available, return null (shouldn't happen, but safety check)
  if (!context) {
    return null;
  }
  
  const { toasts, currentModal, dismissToast, dismissModal } = context;

  return (
    <>
      {/* Toast notifications - stacked at top */}
      <SafeAreaView style={styles.toastContainer} edges={['top']} pointerEvents="box-none">
        <View style={styles.toastList}>
          {toasts.map((notification, index) => (
            <View
              key={notification.id}
              style={[
                styles.toastWrapper,
                { marginTop: index > 0 ? 8 : 0 }
              ]}
            >
              <ErrorToast
                error={notification.error}
                onDismiss={() => dismissToast(notification.id)}
                onRetry={() => {
                  dismissToast(notification.id);
                  // TODO: Implement retry logic
                }}
                autoHide={false} // We handle auto-hide in context
              />
            </View>
          ))}
        </View>
      </SafeAreaView>

      {/* Modal for critical/high severity errors */}
      {currentModal && (
        <ErrorModal
          error={currentModal.error}
          onDismiss={dismissModal}
          onRetry={() => {
            dismissModal();
            // TODO: Implement retry logic
          }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toastList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  toastWrapper: {
    pointerEvents: 'auto',
  },
});

