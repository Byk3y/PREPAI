/**
 * Root layout - Sets up Expo Router, NativeWind, and theme provider
 */

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import '../global.css';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
  });

  const router = useRouter();
  const segments = useSegments();
  const { setAuthUser, setHasCreatedNotebook, setIsInitialized, loadNotebooks, loadPetState } = useStore();

  useEffect(() => {
    // Initialize in background - don't block UI
    const initializeApp = async () => {
      try {
        // Check auth
        const { data: { user } } = await supabase.auth.getUser();
        setAuthUser(user);

        if (user) {
          // Load profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('meta')
            .eq('id', user.id)
            .single();

          setHasCreatedNotebook(profile?.meta?.has_created_notebook || false);

          // Load notebooks and pet - await notebooks to ensure they're loaded before initialization
          try {
            await loadNotebooks();
          } catch (error) {
            console.error('Error loading notebooks during initialization:', error);
            // Continue initialization even if notebooks fail to load
          }

          // Load pet state in background (non-critical)
          loadPetState();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setAuthUser(null);
      } finally {
        // Mark initialization complete (auth check done, notebooks attempted)
        setIsInitialized(true);
      }
    };

    initializeApp();

    // Listen for auth changes (simplified)
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setAuthUser(session?.user ?? null);

      if (session?.user) {
        // Load profile and data in background
        const { data: profile } = await supabase
          .from('profiles')
          .select('meta')
          .eq('id', session.user.id)
          .single();

        setHasCreatedNotebook(profile?.meta?.has_created_notebook || false);
        loadNotebooks();
        loadPetState();
      }
    });

    // Handle deep links when app is opened via magic link
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;

      // Parse the URL to extract path and query params
      const parsed = Linking.parse(url);

      // If it's an auth callback, navigate to it
      if (parsed.path === 'auth/callback' || parsed.path === '/auth/callback') {
        // Extract tokens from query params
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
          // Navigate to callback screen to handle it
          router.push('/auth/callback');
        }
      }
    };

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Listen for deep links when app is already running
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      authSubscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  // Monitor app state for foreground recovery of stuck notebooks
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // App returned to foreground
        console.log('App foregrounded, checking for stuck notebooks...');

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
            .lt('created_at', threeMinutesAgo);

          if (error) {
            console.error('Error checking for stuck notebooks:', error);
            return;
          }

          if (stuckNotebooks && stuckNotebooks.length > 0) {
            console.log(`Found ${stuckNotebooks.length} stuck notebook(s), retrying...`);

            // Retry Edge Function for each stuck notebook
            for (const notebook of stuckNotebooks) {
              console.log(`Retrying notebook ${notebook.id} with material ${notebook.material_id}`);

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
                .then((result: any) => {
                  const { data, error } = result;
                  if (error) {
                    console.error(`Failed to retry notebook ${notebook.id}:`, error);
                    // Mark as failed
                    supabase
                      .from('notebooks')
                      .update({ status: 'failed' })
                      .eq('id', notebook.id);
                  } else {
                    console.log(`Successfully retried notebook ${notebook.id}:`, data);
                  }
                })
                .catch((err) => {
                  console.error(`Error retrying notebook ${notebook.id}:`, err);
                  // Don't mark as failed on timeout/network errors - will retry on next foreground
                  const isTimeout = err.message?.includes('timeout');
                  const isNetworkError =
                    err.message?.includes('fetch') || err.message?.includes('network');

                  if (!isTimeout && !isNetworkError) {
                    // Permanent error, mark as failed
                    supabase
                      .from('notebooks')
                      .update({ status: 'failed' })
                      .eq('id', notebook.id);
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
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F9FAFB' },
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
    </>
  );
}

