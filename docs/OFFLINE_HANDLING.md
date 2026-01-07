# Offline Handling Implementation

This document describes the offline handling implementation added to the Brigo app based on 2025 best practices.

## Overview

The app now supports comprehensive offline detection and handling, providing users with clear feedback when their connection is lost and gracefully handling operations performed while offline.

## Components Added

### 1. Network Context (`lib/contexts/NetworkContext.tsx`)

A React context that provides global network connectivity state using `@react-native-community/netinfo`.

**Features:**
- Real-time network status detection
- `isConnected` - Whether device has network connectivity
- `isInternetReachable` - Whether internet is actually reachable
- `isOffline` - Derived state combining connected + reachable
- `lastOnlineAt` - Timestamp when connection was restored
- `checkConnection()` - Manual connection check function

**Usage:**
```tsx
import { useNetwork } from '@/lib/contexts/NetworkContext';

function MyComponent() {
  const { isOffline, checkConnection } = useNetwork();
  
  if (isOffline) {
    return <Text>You're offline</Text>;
  }
  
  return <Text>You're online</Text>;
}
```

### 2. Offline Banner (`components/OfflineBanner.tsx`)

A persistent banner that slides in from the top of the screen when the device loses internet connectivity.

**Features:**
- Animated slide-in/slide-out
- Clear messaging about offline status
- Respects safe area insets
- Dark red color for urgency

### 3. Pending Sync Indicator (`components/PendingSyncIndicator.tsx`)

A badge that appears at the bottom-right when there are queued operations waiting to sync.

**Features:**
- Shows pending count when offline
- Animates to "Syncing..." when coming back online
- Auto-hides when queue is empty

### 4. Offline Sync Service (`lib/services/offlineSyncService.ts`)

A service for queuing operations when offline and syncing them when back online.

**Features:**
- AsyncStorage-based queue persistence
- Max 50 items in queue
- Retry logic with max 3 attempts
- Operation types: create_notebook, add_material, send_chat, update_notebook, delete_notebook

**API:**
- `addToSyncQueue(type, payload)` - Add operation to queue
- `processSyncQueue(handlers)` - Process all pending operations
- `getPendingCount()` - Get number of pending items
- `clearSyncQueue()` - Clear all items

### 5. Offline Action Hook (`hooks/useOfflineAction.ts`)

A hook for wrapping async actions with offline detection and handling.

**Features:**
- Automatic offline detection before action
- Option to block or queue operations
- Network error detection mid-request
- Toast notifications for feedback

**Usage:**
```tsx
import { useOfflineAction } from '@/hooks/useOfflineAction';

function MyComponent() {
  const { isOffline, withOfflineHandling, showOfflineAlert } = useOfflineAction();
  
  const handleSave = async () => {
    const result = await withOfflineHandling(
      () => saveToServer(data),
      { id: '123', data },
      { operationType: 'create_notebook', queuedMessage: 'Saved locally!' }
    );
    
    if (result.queued) {
      // Operation was queued for later
    } else if (result.success) {
      // Operation completed successfully
    }
  };
}
```

### 6. Offline Sync Hook (`hooks/useOfflineSync.ts`)

A hook for managing the sync queue with auto-sync when coming back online.

**Features:**
- Auto-triggers sync when connection restored
- Provides `queueOrExecute` for conditional execution
- Analytics tracking for offline operations

## Notification Types Added

The notification system was extended with new types:
- `warning` - Orange alert for warnings  
- `offline` - Red alert for offline-related messages
- `info` - Blue info messages

## Integration Points

### Root Layout (`app/_layout.tsx`)

The `NetworkProvider` wraps the entire app, and `OfflineBanner` is rendered at the root level.

```tsx
<ThemeProvider>
  <NetworkProvider>
    <ErrorBoundary component="RootLayout">
      ...
      <OfflineBanner />
    </ErrorBoundary>
  </NetworkProvider>
</ThemeProvider>
```

### Home Screen (`app/index.tsx`)

The `PendingSyncIndicator` is rendered on the home screen to show pending operations.

## Testing Offline Behavior

### Simulator/Emulator
1. iOS Simulator: Use Network Link Conditioner or toggle airplane mode
2. Android Emulator: Use Extended Controls > Cellular > Network type

### Real Device
1. Toggle airplane mode
2. Disable WiFi and cellular data

### Force Testing
The `OfflineBanner` component accepts a `forceShow` prop for testing:
```tsx
<OfflineBanner forceShow={true} />
```

## Best Practices Implemented

Based on 2025 React Native Expo best practices:

1. ✅ **NetInfo for connectivity detection** - Using `@react-native-community/netinfo`
2. ✅ **Clear offline UI banner** - Red banner slides in when offline
3. ✅ **Sync queue for offline operations** - Operations are queued and synced later
4. ✅ **Retry with exponential backoff** - Failed syncs retry up to 3 times
5. ✅ **User notification system** - Toast notifications for offline status
6. ✅ **AsyncStorage for queue persistence** - Queue survives app restarts

## Future Improvements

- [ ] Full sync handler implementation for each operation type
- [ ] Conflict resolution for concurrent modifications
- [ ] Background sync using `expo-task-manager`
- [ ] Image/asset caching with `expo-image` prefetch
- [ ] MMKV for higher-performance caching
