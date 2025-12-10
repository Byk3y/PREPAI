/**
 * Root layout - Sets up Expo Router, NativeWind, and theme provider
 */

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useEffect } from 'react';
import { AppState, Image, useColorScheme, View } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { ThemeProvider, useTheme, getThemeColors } from '@/lib/ThemeContext';
import '../global.css';

import { useStreakCheck } from '@/hooks/useStreakCheck';

// Inner layout component that uses the theme context
function RootLayoutInner() {
  const [fontsLoaded] = useFonts({
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    // Nunito for testing
    'Nunito-Regular': Nunito_400Regular,
    'Nunito-Medium': Nunito_500Medium,
    'Nunito-SemiBold': Nunito_600SemiBold,
    'Nunito-Bold': Nunito_700Bold,
  });

  const router = useRouter();
  const segments = useSegments();
  const { setAuthUser, setHasCreatedNotebook, setIsInitialized, loadNotebooks, loadPetState, hydratePetStateFromCache } = useStore();
  
  // Get theme from context
  const { isDarkMode, effectiveColorScheme } = useTheme();
  const colors = getThemeColors(isDarkMode);
  
  // Also sync with NativeWind (for components that still use dark: classes)
  const { setColorScheme, colorScheme } = useNativeWindColorScheme();
  
  useEffect(() => {
    // Sync NativeWind with our theme context (for components using dark: classes)
    if (colorScheme !== effectiveColorScheme) {
      setColorScheme(effectiveColorScheme);
    }
  }, [effectiveColorScheme, colorScheme, setColorScheme]);
  
  // Initialize streak check on app open
  useStreakCheck();

  useEffect(() => {
    // Single source of truth for auth state and initialization
    // This prevents race conditions between getUser() and onAuthStateChange
    let mounted = true;

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Auth state changed - handled silently

      if (!mounted) return;

      const currentAuthUser = useStore.getState().authUser;
      const newUserId = session?.user?.id;
      const userIdChanged = currentAuthUser?.id !== newUserId;

      setAuthUser(session?.user ?? null);

      if (session?.user) {
        try {
          // Only reset pet state if user actually changed or it's a new sign-in
          // This prevents:
          // 1. Flash of default name on token refresh (TOKEN_REFRESHED event with same user)
          // 2. Cross-user contamination when switching accounts
          // 3. Ensures fresh data on new sign-in
          const { resetPetState, loadPetState } = useStore.getState();
          if (userIdChanged || event === 'SIGNED_IN') {
            resetPetState();
          }
          // Hydrate pet state from per-user cache immediately (instant display)
          hydratePetStateFromCache();

          // 1. Load full profile data (including streak, name, avatar)
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, streak, avatar_url, meta')
            .eq('id', session.user.id)
            .single();

          if (mounted && profile?.meta?.has_created_notebook) {
            setHasCreatedNotebook(true);
          } else if (mounted) {
            setHasCreatedNotebook(false);
          }

          // 2. Load user profile (streak, name, avatar) into store
          const { loadUserProfile } = useStore.getState();
          await loadUserProfile();

          // 3. Load notebooks
          // Pass userId directly to avoid race condition with store state propagation
          await loadNotebooks(session.user.id);

          // 4. Load pet state from database (will overwrite defaults)
          // Use await to ensure it completes before continuing
          await loadPetState();
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        // Clear sensitive state on sign out
        // Reset pet state to defaults
        const { resetPetState } = useStore.getState();
        resetPetState();
        // Note: The store might need a clear() method, but for now specific slices handle their own cleanup
        // or we rely on them replacing data when new user logs in. 
        // Ideally we should clear notebooks here but loadNotebooks() handles "no user" check.
      }

      // Mark initialization as complete after processing the auth state
      if (mounted) {
        setIsInitialized(true);
      }
    });

    // Handle deep links when app is opened via magic link
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      const parsed = Linking.parse(url);

      if (parsed.path === 'auth/callback' || parsed.path === '/auth/callback') {
        const queryParams = parsed.queryParams || {};
        const accessToken = queryParams.access_token as string | undefined;
        const refreshToken = queryParams.refresh_token as string | undefined;

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Deep link auth error:', error);
            router.replace('/auth');
          }
        } else {
          router.push('/auth/callback');
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  // Preload pet assets for all stages
  useEffect(() => {
    const preloadAssets = async () => {
      try {
        // All pet images to preload
        const petImages = [
          require('@/assets/pets/stage-1/bubble.png'),
          require('@/assets/pets/stage-1/full-view.png'),
          require('@/assets/pets/stage-2/bubble.png'),
          require('@/assets/pets/stage-2/full-view.png'),
        ];
        
        const uris = petImages.map(img => Image.resolveAssetSource(img).uri);
        await Promise.all(uris.map(uri => Image.prefetch(uri)));
        console.log('Pet images preloaded successfully');
      } catch (error) {
        console.error('Failed to preload pet images:', error);
      }
    };

    preloadAssets();
  }, []);

  // Monitor app state for foreground recovery of stuck notebooks
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // App returned to foreground - check for stuck notebooks

        const { authUser } = useStore.getState();
        if (!authUser) return;

        try {
          // Find notebooks stuck in 'extracting' status for more than 3 minutes
          const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
          const { data: stuckNotebooks, error } = await supabase
            .from('notebooks')
            .select('id, material_id')
            .eq('user_id', authUser.id)
            .eq('status', 'extracting')
            .lt('updated_at', threeMinutesAgo);

          if (error) {
            console.error('Error checking for stuck notebooks:', error);
            return;
          }

          if (stuckNotebooks && stuckNotebooks.length > 0) {
            // Retry Edge Function for each stuck notebook
            for (const notebook of stuckNotebooks) {

              // Create timeout promise
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Retry timeout after 60s')), 60000)
              );

              // Retry Edge Function invocation
              Promise.race([
                supabase.functions.invoke('process-material', {
                  body: { material_id: notebook.material_id },
                }),
                timeoutPromise,
              ])
                .then(async (result: any) => {
                  const { data, error } = result;
                  if (error) {
                    console.error(`Failed to retry notebook ${notebook.id}:`, error);
                    // Mark as failed
                    const { error: updateError } = await supabase
                      .from('notebooks')
                      .update({ status: 'failed' })
                      .eq('id', notebook.id);
                    if (updateError) {
                      console.error(`Failed to update notebook ${notebook.id} status:`, updateError);
                    }
                  }
                })
                .catch(async (err) => {
                  console.error(`Error retrying notebook ${notebook.id}:`, err);
                  // Don't mark as failed on timeout/network errors - will retry on next foreground
                  const isTimeout = err.message?.includes('timeout');
                  const isNetworkError =
                    err.message?.includes('fetch') || err.message?.includes('network');

                  if (!isTimeout && !isNetworkError) {
                    // Permanent error, mark as failed
                    const { error: updateError } = await supabase
                      .from('notebooks')
                      .update({ status: 'failed' })
                      .eq('id', notebook.id);
                    if (updateError) {
                      console.error(`Failed to update notebook ${notebook.id} status:`, updateError);
                    }
                  }
                });
            }
          }
        } catch (err) {
          console.error('Error in foreground recovery:', err);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;

    const inAuthGroup = segments[0] === 'auth';

    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!user && !inAuthGroup) {
          // Redirect to auth if not logged in
          router.replace('/auth');
        } else if (user && inAuthGroup) {
          // Redirect to home if logged in and on auth screen
          router.replace('/');
        }
      })
      .catch((error) => {
        console.error('Error checking auth state for navigation:', error);
        // On error, redirect to auth screen to be safe
        if (!inAuthGroup) {
          router.replace('/auth');
        }
      });
  }, [segments, fontsLoaded]);

  if (!fontsLoaded) {
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

// Main export - wraps with ThemeProvider
export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}

