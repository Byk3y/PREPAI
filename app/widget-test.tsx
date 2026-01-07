/**
 * Widget Test Screen
 * Navigate to this screen with: npx uri-scheme open "exp://192.168.x.x:8081/--/widget-test" --ios
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { WidgetBridge, buildWidgetData, getPlaceholderWidgetData } from '@/lib/widget';
import { useStore } from '@/lib/store';
import { getLocalDateString } from '@/lib/utils/time';

export default function WidgetTestScreen() {
  const [status, setStatus] = React.useState<string>('Ready');
  const [data, setData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Get store data
  const user = useStore(state => state.user);
  const petState = useStore(state => state.petState);
  const dailyTasks = useStore(state => state.dailyTasks);

  const handleAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsLoading(true);
    try {
      await action();
      setStatus(successMessage);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFromStore = async () => {
    await handleAction(async () => {
      if (!WidgetBridge.isAvailable) {
        throw new Error('Widget not available on this platform');
      }

      // Get current app state
      const today = getLocalDateString();
      const secureTask = dailyTasks?.find(t => t.task_key === 'secure_pet');
      const isSecuredToday = secureTask?.completed &&
        (!secureTask.completed_at || secureTask.completed_at.startsWith(today));

      // Build widget data
      const widgetData = buildWidgetData({
        streak: user.streak || 0,
        lastStreakDate: user.last_streak_date || today,
        securedToday: isSecuredToday,
        lastSecureDate: isSecuredToday ? today : (secureTask?.completed_at?.split('T')[0] || today),
        sessionsToday: dailyTasks?.filter(t => t.completed).length || 0,
        petName: petState.name || 'Pet',
        petStage: (petState.stage || 1) as 1 | 2 | 3,
      });

      await WidgetBridge.updateWidgetData(widgetData);
    }, 'Updated from store!');
  };

  const handleUpdatePlaceholder = async () => {
    await handleAction(async () => {
      const placeholderData = getPlaceholderWidgetData();
      await WidgetBridge.updateWidgetData(placeholderData);
    }, 'Placeholder data sent!');
  };

  const handleGetData = async () => {
    await handleAction(async () => {
      const widgetData = await WidgetBridge.getWidgetData();
      setData(widgetData);
    }, 'Data retrieved');
  };

  const handleReload = async () => {
    await handleAction(async () => {
      await WidgetBridge.reloadTimelines();
    }, 'Timelines reloaded!');
  };

  const handleClear = async () => {
    await handleAction(async () => {
      await WidgetBridge.clearWidgetData();
      setData(null);
    }, 'Data cleared!');
  };

  const handleCheckValidity = async () => {
    await handleAction(async () => {
      const isValid = await WidgetBridge.isDataValid();
      Alert.alert('Data Validity', isValid ? 'Data is valid' : 'Data is stale or missing');
    }, 'Checked validity');
  };

  if (Platform.OS !== 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Widget Test' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Widget is only available on iOS</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Widget Test', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Widget Bridge Test</Text>
          <Text style={styles.status}>Status: {status}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Info</Text>
          <InfoRow label="Available" value={WidgetBridge.isAvailable ? 'Yes ✅' : 'No ❌'} />
          <InfoRow label="App Group" value={WidgetBridge.appGroupIdentifier} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Store Data</Text>
          <InfoRow label="Streak" value={user.streak?.toString() || '0'} />
          <InfoRow label="Pet Name" value={petState.name || 'N/A'} />
          <InfoRow label="Pet Stage" value={petState.stage?.toString() || '1'} />
          <InfoRow label="Tasks Completed" value={dailyTasks?.filter(t => t.completed).length.toString() || '0'} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <ActionButton
            title="1. Update from Store"
            onPress={handleUpdateFromStore}
            disabled={isLoading}
            color="#4CAF50"
          />
          <ActionButton
            title="2. Send Placeholder Data"
            onPress={handleUpdatePlaceholder}
            disabled={isLoading}
            color="#2196F3"
          />
          <ActionButton
            title="3. Get Widget Data"
            onPress={handleGetData}
            disabled={isLoading}
            color="#FF9800"
          />
          <ActionButton
            title="4. Force Reload Widget"
            onPress={handleReload}
            disabled={isLoading}
            color="#9C27B0"
          />
          <ActionButton
            title="Check Data Validity"
            onPress={handleCheckValidity}
            disabled={isLoading}
            color="#607D8B"
          />
          <ActionButton
            title="Clear All Data"
            onPress={handleClear}
            disabled={isLoading}
            color="#F44336"
          />
        </View>

        {data && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Widget Data</Text>
            <ScrollView style={styles.dataContainer} horizontal>
              <Text style={styles.dataText}>{JSON.stringify(data, null, 2)}</Text>
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructionText}>
            1. Tap "Send Placeholder Data" to test with sample data{'\n'}
            2. Go to Home Screen and add the Brigo widget{'\n'}
            3. Come back and tap "Update from Store" to sync real data{'\n'}
            4. Watch the widget update on your Home Screen!{'\n\n'}
            Note: Widget updates may take 5-10 seconds to appear.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  disabled,
  color = '#2196F3'
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color }, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  status: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dataContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    maxHeight: 300,
  },
  dataText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#333',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
