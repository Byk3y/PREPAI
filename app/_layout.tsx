/**
 * Root layout - Sets up Expo Router, NativeWind, and theme provider
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F9FAFB' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="exam/index" />
        <Stack.Screen name="lesson/[id]" />
        <Stack.Screen name="flashcard/[id]" />
        <Stack.Screen 
          name="pet-sheet" 
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  );
}

