# Widget Bridge Module

React Native interface to iOS WidgetKit functionality for the Brigo widget.

## Overview

The WidgetBridge module enables communication between your React Native app and the iOS Widget Extension using App Groups shared storage.

## Architecture

```
React Native (TypeScript)
    ↓
WidgetBridge.ts (Wrapper)
    ↓
NativeModules.WidgetBridge
    ↓
WidgetBridge.m (Objective-C Bridge)
    ↓
WidgetBridge.swift (Native Module)
    ↓
WidgetDataManager.swift (Shared UserDefaults)
    ↓
App Group: group.com.brigo.shared
    ↓
Widget Extension (SwiftUI)
```

## Quick Start

### 1. Import the module

```typescript
import { WidgetBridge, buildWidgetData } from '@/lib/widget';
```

### 2. Update widget data

```typescript
// Example: After user completes study session
const widgetData = buildWidgetData({
  // From user state
  streak: user.streak,
  lastStreakDate: user.last_streak_date,

  // From daily tasks
  securedToday: secureTask?.completed || false,
  lastSecureDate: getLocalDateString(),
  sessionsToday: completedTasksToday.length,

  // From pet state
  petName: petState.name,
  petStage: petState.stage,

  // Optional: exam tracking
  nearestExam: nearestExam ? {
    title: nearestExam.title,
    date: nearestExam.date,
  } : undefined,
});

await WidgetBridge.updateWidgetData(widgetData);
```

## API Reference

### WidgetBridge Class

#### Static Properties

##### `isAvailable: boolean`
Check if widget functionality is available (iOS only).

```typescript
if (WidgetBridge.isAvailable) {
  // Widget functionality is available
}
```

##### `appGroupIdentifier: string`
Get the App Group identifier used for shared storage.

```typescript
console.log(WidgetBridge.appGroupIdentifier); // "group.com.brigo.shared"
```

#### Static Methods

##### `updateWidgetData(data: WidgetData): Promise<void>`
Update widget data in shared storage. Automatically adds timestamp and triggers widget reload (debounced to 5 minutes).

```typescript
await WidgetBridge.updateWidgetData({
  streak: 15,
  lastStreakDate: '2026-01-06',
  studyStatus: {
    securedToday: true,
    lastSecureDate: '2026-01-06',
    sessionsToday: 2
  },
  pet: {
    name: 'Bubbles',
    stage: 2,
    isDying: false
  }
});
```

##### `getWidgetData(): Promise<WidgetData | null>`
Get current widget data from shared storage.

```typescript
const currentData = await WidgetBridge.getWidgetData();
if (currentData) {
  console.log('Current streak:', currentData.streak);
}
```

##### `reloadTimelines(): Promise<void>`
Manually reload widget timelines. Use sparingly - updates are debounced.

```typescript
await WidgetBridge.reloadTimelines();
```

##### `isDataValid(): Promise<boolean>`
Check if widget data is valid (not stale). Returns false if data is older than 24 hours.

```typescript
const isValid = await WidgetBridge.isDataValid();
if (!isValid) {
  // Data is stale, update it
  await WidgetBridge.updateWidgetData(newData);
}
```

##### `clearWidgetData(): Promise<void>`
Clear all widget data (for testing/debugging).

```typescript
await WidgetBridge.clearWidgetData();
```

## Helper Functions

### `buildWidgetData(params): WidgetData`
Build complete widget data from app state components.

```typescript
const widgetData = buildWidgetData({
  streak: user.streak,
  lastStreakDate: user.last_streak_date,
  securedToday: true,
  lastSecureDate: '2026-01-06',
  sessionsToday: 2,
  petName: petState.name,
  petStage: petState.stage,
  nearestExam: {
    title: 'WAEC 2026',
    date: '2026-05-15'
  }
});
```

### `shouldUpdateWidget(newData, oldData): boolean`
Check if widget data has changed significantly enough to warrant an update.

```typescript
const oldData = await WidgetBridge.getWidgetData();
const newData = buildWidgetData({ /* ... */ });

if (shouldUpdateWidget(newData, oldData)) {
  await WidgetBridge.updateWidgetData(newData);
}
```

### `validateWidgetData(data): boolean`
Validate widget data structure before sending to native.

```typescript
if (validateWidgetData(data)) {
  await WidgetBridge.updateWidgetData(data);
}
```

### `getPlaceholderWidgetData(): WidgetData`
Get sample widget data for testing.

```typescript
const testData = getPlaceholderWidgetData();
await WidgetBridge.updateWidgetData(testData);
```

## Integration Points

### Where to Call `updateWidgetData()`

Based on the implementation plan, update widget data in these locations:

#### 1. User Slice (lib/store/slices/userSlice.ts)
When streak or last_streak_date changes:

```typescript
const setUser = (updates: Partial<User>) => {
  set((state) => ({
    user: { ...state.user, ...updates }
  }));

  // Update widget if streak changed
  if (updates.streak !== undefined || updates.last_streak_date) {
    updateWidget(); // See example below
  }
};
```

#### 2. Pet Slice (lib/store/slices/petSlice.ts)
When pet stage, points, or name changes:

```typescript
const setPetState = async (updates: Partial<PetState>) => {
  set((state) => ({
    petState: { ...state.petState, ...updates }
  }));

  // Update widget if pet changed
  if (updates.stage !== undefined || updates.name) {
    await updateWidget();
  }
};
```

#### 3. Daily Tasks (wherever daily_tasks are managed)
After completing `secure_pet` task:

```typescript
const completeTask = async (taskKey: string) => {
  // ... complete task logic

  if (taskKey === 'secure_pet') {
    await updateWidget();
  }
};
```

#### 4. Exam Management (wherever exams are created/updated)
After creating or updating exams:

```typescript
const saveExam = async (exam: Exam) => {
  await supabase.from('exams').insert(exam);

  // Update widget with nearest exam
  await updateWidget();
};
```

## Complete Integration Example

```typescript
// lib/widget/integration.ts
import { WidgetBridge, buildWidgetData } from '@/lib/widget';
import { useStore } from '@/lib/store';
import { getLocalDateString } from '@/lib/utils/time';

/**
 * Update widget with current app state
 * Call this function whenever any widget-relevant data changes
 */
export async function updateWidget() {
  try {
    const { user, petState, dailyTasks } = useStore.getState();

    // Check if secure_pet task is completed today
    const today = getLocalDateString();
    const secureTask = dailyTasks?.find(t => t.task_key === 'secure_pet');
    const isSecuredToday = secureTask?.completed &&
      (!secureTask.completed_at || secureTask.completed_at.startsWith(today));

    // Build widget data
    const widgetData = buildWidgetData({
      // User data
      streak: user.streak,
      lastStreakDate: user.last_streak_date,

      // Study status
      securedToday: isSecuredToday,
      lastSecureDate: isSecuredToday ? today : (secureTask?.completed_at?.split('T')[0] || today),
      sessionsToday: dailyTasks?.filter(t => t.completed).length || 0,

      // Pet data
      petName: petState.name,
      petStage: petState.stage,

      // TODO: Add exam tracking when exam feature is implemented
      // nearestExam: calculateNearestExam(exams),
    });

    // Update widget
    await WidgetBridge.updateWidgetData(widgetData);

    console.log('✅ Widget updated successfully');
  } catch (error) {
    console.error('❌ Failed to update widget:', error);
  }
}
```

## Testing

### Test Widget Update

```typescript
import { WidgetBridge, getPlaceholderWidgetData } from '@/lib/widget';

// Test with placeholder data
const testData = getPlaceholderWidgetData();
await WidgetBridge.updateWidgetData(testData);

// Check if data was saved
const savedData = await WidgetBridge.getWidgetData();
console.log('Saved widget data:', savedData);

// Verify data is valid
const isValid = await WidgetBridge.isDataValid();
console.log('Data is valid:', isValid);
```

### Debug Widget State

```typescript
// Get current widget data
const data = await WidgetBridge.getWidgetData();
console.log('Current widget data:', JSON.stringify(data, null, 2));

// Clear and reset
await WidgetBridge.clearWidgetData();
await WidgetBridge.updateWidgetData(newData);
```

## Troubleshooting

### Widget not updating
1. Check if App Groups entitlement is configured in Xcode
2. Ensure `group.com.brigo.shared` is registered in Apple Developer Portal
3. Verify Widget Extension has same App Group enabled
4. Check console logs for bridge errors

### "WidgetBridge doesn't seem to be linked" error
1. Run `npx pod-install` (or `cd ios && pod install`)
2. Rebuild the app: `npx expo run:ios`
3. Clean build folder in Xcode if needed

### Data appears stale
- Widget updates are debounced to 5 minutes
- iOS controls actual refresh frequency (not guaranteed)
- Use `reloadTimelines()` to force immediate refresh

## Next Steps

1. ✅ Widget Bridge module created
2. ⏭️ Integrate into Zustand store slices
3. ⏭️ Create Widget Extension target in Xcode
4. ⏭️ Implement SwiftUI widget views
5. ⏭️ Test on device

## Files Created

```
lib/widget/
├── WidgetBridge.ts       # Main API wrapper
├── types.ts              # TypeScript interfaces
├── helpers.ts            # Utility functions
├── index.ts              # Module exports
└── README.md             # This file

ios/Brigo/
├── WidgetBridge.swift    # Native module
├── WidgetBridge.m        # Objective-C bridge
└── WidgetDataManager.swift  # UserDefaults manager
```

## Resources

- [React Native Native Modules](https://reactnative.dev/docs/native-modules-ios)
- [iOS App Groups](https://developer.apple.com/documentation/xcode/configuring-app-groups)
- [WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
