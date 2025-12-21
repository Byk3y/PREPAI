/**
 * Root layout - Sets up Expo Router, NativeWind, and theme provider
 */

// Initialize Sentry as early as possible (before React renders)
import { initSentry } from '@/lib/sentry';

initSentry();

// Suppress expected Supabase auth errors in console (invalid refresh token when logged out)
if (typeof console !== 'undefined' && console.error) {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Suppress expected auth errors when logged out
    if (
      message.includes('Invalid Refresh Token') ||
      message.includes('Refresh Token Not Found') ||
      message.includes('refresh_token_not_found') ||
      (message.includes('AuthApiError') && message.includes('Refresh Token')) ||
      (message.includes('Request rate limit reached') && message.includes('AuthApiError'))
    ) {
      // Don't log these expected errors - they're harmless when logged out or during rapid reloads
      if (__DEV__) {
        // Only log in dev mode for debugging, but silently
        return;
      }
      return;
    }
    // Log all other errors normally
    originalError.apply(console, args);
  };
}

// Initialize Mixpanel as early as possible (before React renders)
import { initMixpanel } from '@/lib/services/analyticsService';

initMixpanel();

// Initialize Google Sign-In configuration (OAuth flow - works in Expo Go)
import { configureGoogleSignIn } from '@/lib/auth/googleSignIn';

configureGoogleSignIn();

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
  // Show a loading screen with proper background color instead of null to prevent dark flash
  if (!fontsLoaded || !isRoutingReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      </View>
    );
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

