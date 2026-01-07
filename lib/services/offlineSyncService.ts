/**
 * Offline Sync Service - Queue and sync operations when offline
 * Best Practice 2025: Queue user actions when offline, sync when back online
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_QUEUE_KEY = 'brigo_sync_queue';
const MAX_QUEUE_SIZE = 50;

export interface SyncQueueItem {
    id: string;
    type: 'create_notebook' | 'add_material' | 'send_chat' | 'update_notebook' | 'delete_notebook';
    payload: Record<string, any>;
    createdAt: number;
    retryCount: number;
    status: 'pending' | 'syncing' | 'failed';
    errorMessage?: string;
}

export interface SyncQueue {
    items: SyncQueueItem[];
    lastSyncAt: number | null;
}

/**
 * Generate a unique ID for queue items
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load the sync queue from AsyncStorage
 */
export async function loadSyncQueue(): Promise<SyncQueue> {
    try {
        const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('[OfflineSync] Error loading queue:', error);
    }
    return { items: [], lastSyncAt: null };
}

/**
 * Save the sync queue to AsyncStorage
 */
async function saveSyncQueue(queue: SyncQueue): Promise<void> {
    try {
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
        console.error('[OfflineSync] Error saving queue:', error);
    }
}

/**
 * Add an item to the sync queue
 */
export async function addToSyncQueue(
    type: SyncQueueItem['type'],
    payload: Record<string, any>
): Promise<SyncQueueItem> {
    const queue = await loadSyncQueue();

    // Prevent queue from growing too large
    if (queue.items.length >= MAX_QUEUE_SIZE) {
        // Remove oldest failed items first
        const failedItems = queue.items.filter(i => i.status === 'failed');
        if (failedItems.length > 0) {
            queue.items = queue.items.filter(i => i.id !== failedItems[0].id);
        } else {
            // Remove oldest pending item
            queue.items.shift();
        }
    }

    const item: SyncQueueItem = {
        id: generateId(),
        type,
        payload,
        createdAt: Date.now(),
        retryCount: 0,
        status: 'pending',
    };

    queue.items.push(item);
    await saveSyncQueue(queue);

    console.log(`[OfflineSync] Queued ${type} operation (${queue.items.length} items in queue)`);

    return item;
}

/**
 * Update an item's status in the queue
 */
export async function updateQueueItem(
    itemId: string,
    update: Partial<SyncQueueItem>
): Promise<void> {
    const queue = await loadSyncQueue();
    const index = queue.items.findIndex(i => i.id === itemId);

    if (index !== -1) {
        queue.items[index] = { ...queue.items[index], ...update };
        await saveSyncQueue(queue);
    }
}

/**
 * Remove an item from the queue
 */
export async function removeFromSyncQueue(itemId: string): Promise<void> {
    const queue = await loadSyncQueue();
    queue.items = queue.items.filter(i => i.id !== itemId);
    await saveSyncQueue(queue);
}

/**
 * Get pending items count
 */
export async function getPendingCount(): Promise<number> {
    const queue = await loadSyncQueue();
    return queue.items.filter(i => i.status === 'pending').length;
}

/**
 * Clear all items from the queue (for testing/reset)
 */
export async function clearSyncQueue(): Promise<void> {
    await saveSyncQueue({ items: [], lastSyncAt: null });
    console.log('[OfflineSync] Queue cleared');
}

/**
 * Process the sync queue (call when online)
 * Returns the number of successfully synced items
 */
export async function processSyncQueue(
    handlers: {
        create_notebook?: (payload: any) => Promise<void>;
        add_material?: (payload: any) => Promise<void>;
        send_chat?: (payload: any) => Promise<void>;
        update_notebook?: (payload: any) => Promise<void>;
        delete_notebook?: (payload: any) => Promise<void>;
    }
): Promise<{ success: number; failed: number }> {
    const queue = await loadSyncQueue();
    const pendingItems = queue.items.filter(i => i.status === 'pending');

    if (pendingItems.length === 0) {
        return { success: 0, failed: 0 };
    }

    console.log(`[OfflineSync] Processing ${pendingItems.length} queued operations...`);

    let successCount = 0;
    let failedCount = 0;

    for (const item of pendingItems) {
        const handler = handlers[item.type];

        if (!handler) {
            console.warn(`[OfflineSync] No handler for type: ${item.type}`);
            await updateQueueItem(item.id, {
                status: 'failed',
                errorMessage: 'No handler registered',
            });
            failedCount++;
            continue;
        }

        try {
            await updateQueueItem(item.id, { status: 'syncing' });
            await handler(item.payload);
            await removeFromSyncQueue(item.id);
            successCount++;
            console.log(`[OfflineSync] ✅ Synced ${item.type}`);
        } catch (error: any) {
            const retryCount = item.retryCount + 1;
            const shouldRetry = retryCount < 3;

            await updateQueueItem(item.id, {
                status: shouldRetry ? 'pending' : 'failed',
                retryCount,
                errorMessage: error?.message || 'Unknown error',
            });

            if (!shouldRetry) {
                failedCount++;
                console.error(`[OfflineSync] ❌ Failed ${item.type} after ${retryCount} attempts:`, error);

                // Report permanent failure to Sentry for production visibility
                const { captureException } = require('@sentry/react-native');
                captureException(error, {
                    tags: {
                        operation: 'offline_sync_permanent_failure',
                        sync_type: item.type,
                    },
                    extra: {
                        itemId: item.id,
                        retryCount,
                        createdAt: new Date(item.createdAt).toISOString(),
                    }
                });
            } else {
                console.warn(`[OfflineSync] ⚠️ Will retry ${item.type} (attempt ${retryCount}/3)`);
            }
        }
    }

    // Update last sync time
    queue.lastSyncAt = Date.now();
    await saveSyncQueue(queue);

    console.log(`[OfflineSync] Sync complete: ${successCount} success, ${failedCount} failed`);

    return { success: successCount, failed: failedCount };
}

export const offlineSyncService = {
    loadSyncQueue,
    addToSyncQueue,
    updateQueueItem,
    removeFromSyncQueue,
    getPendingCount,
    clearSyncQueue,
    processSyncQueue,
};
