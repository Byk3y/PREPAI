/**
 * Widget Bridge Integration Example
 *
 * This file demonstrates how to integrate WidgetBridge into your React Native app.
 * Copy the patterns shown here into your actual components and store slices.
 */

import React, { useEffect } from 'react';
import { View, Button, Text, ScrollView, StyleSheet } from 'react-native';
import { WidgetBridge, buildWidgetData } from '@/lib/widget';
import { useStore } from '@/lib/store';
import { getLocalDateString } from '@/lib/utils/time';
import { runAllWidgetTests } from '@/lib/widget/__tests__/WidgetBridge.test';

/**
 * Example 1: Update widget from current app state
 */
export async function updateWidgetFromStore() {
  if (!WidgetBridge.isAvailable) {
    console.warn('[Widget] Not available on this platform');
    return;
  }

  try {
    // Get current app state
    const { user, petState, dailyTasks } = useStore.getState();
    const today = getLocalDateString();

    // Check if secure_pet task is completed today
    const secureTask = dailyTasks?.find(t => t.task_key === 'secure_pet');
    const isSecuredToday = secureTask?.completed &&
      (!secureTask.completed_at || secureTask.completed_at.startsWith(today));

    // Build widget data from current state
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

      // TODO: Add exam tracking when implemented
      // nearestExam: calculateNearestExam(),
    });

    // Update widget
    await WidgetBridge.updateWidgetData(widgetData);
    console.log('✅ [Widget] Updated successfully');
  } catch (error) {
    console.error('❌ [Widget] Update failed:', error);
  }
}

/**
 * Example 2: Update widget when specific data changes
 */
export function useWidgetUpdate() {
  const user = useStore(state => state.user);
  const petState = useStore(state => state.petState);
  const dailyTasks = useStore(state => state.dailyTasks);

  useEffect(() => {
    // Update widget whenever relevant data changes
    updateWidgetFromStore();
  }, [
    user.streak,
    user.last_streak_date,
    petState.stage,
    petState.name,
    dailyTasks?.find(t => t.task_key === 'secure_pet')?.completed,
  ]);
}

/**
 * Example 3: Integration into Zustand store slice
 *
 * Add this to lib/store/slices/userSlice.ts:
 */
/*
import { WidgetBridge } from '@/lib/widget';
import { updateWidgetFromStore } from '@/lib/widget/integration';

export const createUserSlice: StateCreator<UserSlice> = (set, get) => ({
  user: {
    id: '',
    name: '',
    streak: 0,
    coins: 0,
    // ... other fields
  },

  setUser: (updates: Partial<User>) => {
    set((state) => ({
      user: { ...state.user, ...updates }
    }));

    // Update widget if streak or last_streak_date changed
    if (updates.streak !== undefined || updates.last_streak_date !== undefined) {
      updateWidgetFromStore().catch(console.error);
    }
  },

  // ... other methods
});
*/

/**
 * Example 4: Test component with widget controls
 */
export function WidgetTestScreen() {
  const [status, setStatus] = React.useState<string>('Ready');
  const [data, setData] = React.useState<any>(null);

  const handleUpdate = async () => {
    setStatus('Updating...');
    await updateWidgetFromStore();
    setStatus('Updated!');
  };

  const handleGetData = async () => {
    setStatus('Fetching...');
    const widgetData = await WidgetBridge.getWidgetData();
    setData(widgetData);
    setStatus('Data retrieved');
  };

  const handleRunTests = async () => {
    setStatus('Running tests...');
    await runAllWidgetTests();
    setStatus('Tests complete (check console)');
  };

  const handleClear = async () => {
    setStatus('Clearing...');
    await WidgetBridge.clearWidgetData();
    setData(null);
    setStatus('Cleared!');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Widget Bridge Test</Text>
      <Text style={styles.status}>Status: {status}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Info</Text>
        <Text>Available: {WidgetBridge.isAvailable ? 'Yes' : 'No'}</Text>
        <Text>App Group: {WidgetBridge.appGroupIdentifier}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <Button title="Update Widget" onPress={handleUpdate} />
        <Button title="Get Widget Data" onPress={handleGetData} />
        <Button title="Run All Tests" onPress={handleRunTests} />
        <Button title="Clear Data" onPress={handleClear} color="red" />
      </View>

      {data && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Data</Text>
          <Text style={styles.dataText}>{JSON.stringify(data, null, 2)}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dataText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },
});

/**
 * Example 5: Integration into app lifecycle
 *
 * Add to your root App component or main layout:
 */
/*
import { updateWidgetFromStore } from '@/lib/widget/integration';
import { AppState } from 'react-native';

export function App() {
  useEffect(() => {
    // Update widget when app launches
    updateWidgetFromStore();

    // Update widget when app returns from background
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateWidgetFromStore();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <YourAppContent />;
}
*/

/**
 * Example 6: Manual widget update after specific actions
 */
export async function onStudySessionComplete() {
  // Your study session completion logic here...

  // Update widget to reflect new study status
  await updateWidgetFromStore();

  // Optionally force immediate reload
  await WidgetBridge.reloadTimelines();
}

export async function onStreakMilestone(streak: number) {
  // Your milestone celebration logic here...

  // Update widget with milestone data
  await updateWidgetFromStore();
}

export async function onPetEvolution(newStage: number) {
  // Your pet evolution logic here...

  // Update widget to show new pet stage
  await updateWidgetFromStore();
}
