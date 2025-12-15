/**
 * Root layout - Sets up Expo Router, NativeWind, and theme provider
 */

// Initialize Sentry as early as possible (before React renders)
import { initSentry } from '@/lib/sentry';

initSentry();

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, View } from 'react-native';
import { ThemeProvider, useTheme, getThemeColors } from '@/lib/ThemeContext';
import { ErrorNotificationProvider } from '@/lib/contexts/ErrorNotificationContext';
import { ErrorNotificationContainer } from '@/components/ErrorNotificationContainer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '../global.css';

// Custom hooks for modular functionality
import { useAppFonts } from '@/hooks/useFonts';
import { useGlobalErrorHandler } from '@/hooks/useGlobalErrorHandler';
import { useThemeSync } from '@/hooks/useThemeSync';
import { useAuthSetup } from '@/hooks/useAuthSetup';
import { useDeepLinks } from '@/hooks/useDeepLinks';
import { useAssetPreloading } from '@/hooks/useAssetPreloading';
import { useAppStateMonitoring } from '@/hooks/useAppStateMonitoring';
import { useRoutingLogic } from '@/hooks/useRoutingLogic';
import { useStreakCheck } from '@/hooks/useStreakCheck';

// Inner layout component that uses the theme context
function RootLayoutInner() {
  // Load fonts
  const fontsLoaded = useAppFonts();
  
  // Get theme from context
  const { isDarkMode, effectiveColorScheme } = useTheme();
  const colors = getThemeColors(isDarkMode);
  
  // Initialize all app setup hooks
  useGlobalErrorHandler();
  useThemeSync();
  useAuthSetup();
  useDeepLinks();
  useAssetPreloading();
  useAppStateMonitoring();
  useStreakCheck();
  
  // Handle routing logic (waits for fonts and hydration)
  const isRoutingReady = useRoutingLogic(fontsLoaded);

  // Don't render Stack until fonts are loaded AND routing logic has run at least once
  // This prevents the home screen from flashing before redirect
  if (!fontsLoaded || !isRoutingReady) {
    return null;
  }

  return (
    <View 
      key={`theme-${effectiveColorScheme}`}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="auth/index" />
        <Stack.Screen name="auth/magic-link" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="exam/index" />
        <Stack.Screen name="lesson/[id]" />
        <Stack.Screen name="quiz/[id]" />
        <Stack.Screen
          name="pet-sheet"
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
      {/* 
        Hidden render to force texture decoding of the large pet image.
        Keep at full render size to hold the decoded texture in memory between opens.
        Opacity 0 and offscreen positioning prevent visual impact.
      */}
      <Image
        source={require('@/assets/pets/stage-1/full-view.png')}
        style={{ width: 300, height: 300, opacity: 0, position: 'absolute', top: -9999, left: -9999 }}
        fadeDuration={0}
      />
      <Image
        source={require('@/assets/pets/stage-2/silhouette.png')}
        style={{ width: 300, height: 300, opacity: 0, position: 'absolute', top: -9999, left: -9999 }}
        fadeDuration={0}
      />
    </View>
  );
}

// Main export - wraps with ThemeProvider, ErrorNotificationProvider, and ErrorBoundary
export default function RootLayout() {
  return (
    <ThemeProvider>
      <ErrorBoundary component="RootLayout">
        <ErrorNotificationProvider>
          <ErrorNotificationContainer />
          <RootLayoutInner />
        </ErrorNotificationProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

