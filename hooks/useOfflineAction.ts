/**
 * useOfflineAction Hook
 * Wraps actions with offline detection and provides user feedback
 * Best Practice 2025: Graceful degradation with clear user communication
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNetwork } from '@/lib/contexts/NetworkContext';
import { addToSyncQueue, SyncQueueItem } from '@/lib/services/offlineSyncService';
import { track } from '@/lib/services/analyticsService';
import { triggerNotification } from '@/lib/store/slices/notificationSlice';

export interface OfflineActionOptions {
    /** Type of operation for the sync queue */
    operationType: SyncQueueItem['type'];
    /** If true, show an alert when offline instead of queuing */
    blockWhenOffline?: boolean;
    /** Custom message to show when action is queued */
    queuedMessage?: string;
    /** Custom message to show when action is blocked */
    blockedMessage?: string;
    /** If true, don't show any notifications */
    silent?: boolean;
}

export interface UseOfflineActionReturn {
    /** Check if we're currently offline */
    isOffline: boolean;
    /** Wrap an async action with offline handling */
    withOfflineHandling: <T>(
        action: () => Promise<T>,
        payload: Record<string, any>,
        options: OfflineActionOptions
    ) => Promise<{ success: boolean; result: T | null; queued: boolean }>;
    /** Show an offline alert to the user */
    showOfflineAlert: (customMessage?: string) => void;
}

export function useOfflineAction(): UseOfflineActionReturn {
    const { isOffline, checkConnection } = useNetwork();

    const showOfflineAlert = useCallback((customMessage?: string) => {
        Alert.alert(
            "You're Offline",
            customMessage || "This action requires an internet connection. Please check your connection and try again.",
            [{ text: 'OK' }]
        );
    }, []);

    const withOfflineHandling = useCallback(
        async <T,>(
            action: () => Promise<T>,
            payload: Record<string, any>,
            options: OfflineActionOptions
        ): Promise<{ success: boolean; result: T | null; queued: boolean }> => {
            // Double-check connection status
            const isCurrentlyOnline = await checkConnection();

            if (!isCurrentlyOnline) {
                // We're offline
                if (options.blockWhenOffline) {
                    // Block the action entirely
                    if (!options.silent) {
                        showOfflineAlert(options.blockedMessage);
                    }

                    track('offline_action_blocked', {
                        operation_type: options.operationType,
                    });

                    return { success: false, result: null, queued: false };
                }

                // Queue the action for later
                await addToSyncQueue(options.operationType, payload);

                if (!options.silent) {
                    triggerNotification({
                        type: 'info',
                        title: 'Saved Offline',
                        message: options.queuedMessage || "Your action has been saved and will sync when you're back online.",
                    });
                }

                track('offline_action_queued', {
                    operation_type: options.operationType,
                });

                return { success: true, result: null, queued: true };
            }

            // We're online, execute the action
            try {
                const result = await action();
                return { success: true, result, queued: false };
            } catch (error: any) {
                // Check if this is a network error that occurred mid-request
                const errorMessage = error?.message?.toLowerCase() || '';
                const isNetworkError =
                    errorMessage.includes('network') ||
                    errorMessage.includes('fetch') ||
                    errorMessage.includes('connection') ||
                    errorMessage.includes('timeout');

                if (isNetworkError && !options.blockWhenOffline) {
                    // Queue for retry
                    await addToSyncQueue(options.operationType, payload);

                    if (!options.silent) {
                        triggerNotification({
                            type: 'warning',
                            title: 'Connection Lost',
                            message: "Your action has been saved and will complete when your connection is restored.",
                        });
                    }

                    return { success: true, result: null, queued: true };
                }

                // Re-throw non-network errors
                throw error;
            }
        },
        [checkConnection, showOfflineAlert]
    );

    return {
        isOffline,
        withOfflineHandling,
        showOfflineAlert,
    };
}
