/**
 * Auth Callback Handler
 * Handles OAuth and magic link callbacks
 */

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle deep link URL if app was opened via magic link
        const url = await Linking.getInitialURL();
        if (url) {
          const parsed = Linking.parse(url);
          console.log('Deep link URL:', url);
          console.log('Parsed URL:', parsed);
          
          // Extract tokens from query params or hash
          const queryParams = parsed.queryParams || {};
          const accessToken = (queryParams.access_token || params.access_token) as string | undefined;
          const refreshToken = (queryParams.refresh_token || params.refresh_token) as string | undefined;

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Auth callback error:', error);
              router.replace('/auth');
              return;
            }
          }
        } else {
          // Handle OAuth and magic link callbacks from params
          const accessToken = params.access_token as string | undefined;
          const refreshToken = params.refresh_token as string | undefined;

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Auth callback error:', error);
              router.replace('/auth');
              return;
            }
          }
        }

        // Check if user is authenticated
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check for pending names from magic link signup
          const pendingFirstName = await AsyncStorage.getItem('pending_first_name');
          const pendingLastName = await AsyncStorage.getItem('pending_last_name');

          if (pendingFirstName && pendingLastName) {
            try {
              // Save names to profiles table
              const { error } = await supabase
                .from('profiles')
                .update({
                  first_name: pendingFirstName,
                  last_name: pendingLastName,
                })
                .eq('id', user.id);

              if (!error) {
                // Clear pending data
                await AsyncStorage.removeItem('pending_first_name');
                await AsyncStorage.removeItem('pending_last_name');
                console.log('Names saved from magic link:', pendingFirstName, pendingLastName);
              } else {
                console.error('Failed to save names:', error);
              }
            } catch (error) {
              console.error('Error saving names:', error);
            }
          } else {
            // No magic link names - check if we should extract from OAuth metadata
            // This handles existing accounts that sign in via OAuth
            try {
              // Check current profile state
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', user.id)
                .single();

              if (profileError && profileError.code !== 'PGRST116') {
                console.error('Error checking profile:', profileError);
              } else if (profile) {
                // Check if names are missing or invalid (empty, null, or email-like)
                const hasValidFirstName = profile.first_name && 
                  profile.first_name.trim() !== '' && 
                  !profile.first_name.includes('@');
                const hasValidLastName = profile.last_name && 
                  profile.last_name.trim() !== '';

                // Only update if names are missing or invalid
                if (!hasValidFirstName || !hasValidLastName) {
                  // Extract name from OAuth metadata
                  const oauthName = user.user_metadata?.name || 
                                   user.user_metadata?.full_name ||
                                   user.raw_user_meta_data?.name;

                  if (oauthName && typeof oauthName === 'string' && oauthName.trim() !== '') {
                    // Parse OAuth name into first and last
                    let parsedFirstName = '';
                    let parsedLastName = '';

                    if (oauthName.includes(' ')) {
                      // Has space - split into first and last
                      const parts = oauthName.trim().split(/\s+/);
                      parsedFirstName = parts[0];
                      parsedLastName = parts.slice(1).join(' '); // Handle multiple spaces
                    } else {
                      // No space - put entire string in first_name
                      parsedFirstName = oauthName.trim();
                      parsedLastName = '';
                    }

                    // Only update the missing parts
                    const updates: { first_name?: string; last_name?: string } = {};
                    if (!hasValidFirstName) {
                      updates.first_name = parsedFirstName;
                    }
                    if (!hasValidLastName && parsedLastName) {
                      updates.last_name = parsedLastName;
                    }

                    if (Object.keys(updates).length > 0) {
                      const { error: updateError } = await supabase
                        .from('profiles')
                        .update(updates)
                        .eq('id', user.id);

                      if (!updateError) {
                        console.log('Names extracted from OAuth metadata:', updates);
                      } else {
                        console.error('Failed to update names from OAuth:', updateError);
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error extracting OAuth names:', error);
            }
          }

          // Handle pending pet name from onboarding with retry logic
          const store = useStore.getState();
          const pendingPetName = store.pendingPetName;
          const currentOnboardingScreen = store.currentOnboardingScreen;

          if (pendingPetName) {
            // Check if pet state already exists with a customized name
            // Default names that can be overwritten: 'Nova', 'Sparky', or empty/null
            const defaultNames = ['Nova', 'Sparky'];
            
            try {
              const { data: existingPetState, error: petStateError } = await supabase
                .from('pet_states')
                .select('name')
                .eq('user_id', user.id)
                .single();

              // PGRST116 = no rows returned (pet state doesn't exist yet)
              if (petStateError && petStateError.code === 'PGRST116') {
                // No pet state exists - save the new name from onboarding
                // This will create the pet state with the new name
                let retryCount = 0;
                const maxRetries = 3;
                let success = false;

                while (retryCount < maxRetries && !success) {
                  try {
                    await store.updatePetName(pendingPetName);
                    store.clearPendingPetName();
                    console.log('Pet name saved (new pet state):', pendingPetName);
                    success = true;
                  } catch (error) {
                    retryCount++;
                    console.error(`Error saving pet name (attempt ${retryCount}/${maxRetries}):`, error);

                    if (retryCount >= maxRetries) {
                      console.error('Failed to save pet name after max retries.');
                    } else {
                      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    }
                  }
                }
                return; // Exit early, we've handled the new pet state case
              }

              if (petStateError) {
                // Some other error - proceed with save attempt
                throw petStateError;
              }

              // Check if pet already has a customized name (not default)
              const hasCustomName = existingPetState && 
                existingPetState.name && 
                existingPetState.name.trim() !== '' &&
                !defaultNames.includes(existingPetState.name.trim());

              if (hasCustomName) {
                // Pet already has a customized name - preserve it, don't overwrite
                console.log('Pet name already customized, preserving:', existingPetState.name);
                store.clearPendingPetName(); // Clear pending name since we're not using it
              } else {
                // No custom name exists - save the new name from onboarding
                let retryCount = 0;
                const maxRetries = 3;
                let success = false;

                while (retryCount < maxRetries && !success) {
                  try {
                    // Save pet name to database
                    await store.updatePetName(pendingPetName);

                    // Clear pending name only after successful save
                    store.clearPendingPetName();

                    console.log('Pet name saved:', pendingPetName);
                    success = true;
                  } catch (error) {
                    retryCount++;
                    console.error(`Error saving pet name (attempt ${retryCount}/${maxRetries}):`, error);

                    if (retryCount >= maxRetries) {
                      // Failed after all retries - keep pendingPetName for later retry
                      console.error('Failed to save pet name after max retries. Will retry on next app launch.');
                      // Don't clear pendingPetName - it will be retried on next app open
                    } else {
                      // Wait before retry (exponential backoff)
                      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    }
                  }
                }
              }
            } catch (error) {
              // Error checking pet state - proceed with saving (safer to save than lose)
              console.error('Error checking existing pet state, proceeding with save:', error);
              let retryCount = 0;
              const maxRetries = 3;
              let success = false;

              while (retryCount < maxRetries && !success) {
                try {
                  await store.updatePetName(pendingPetName);
                  store.clearPendingPetName();
                  console.log('Pet name saved:', pendingPetName);
                  success = true;
                } catch (saveError) {
                  retryCount++;
                  console.error(`Error saving pet name (attempt ${retryCount}/${maxRetries}):`, saveError);

                  if (retryCount >= maxRetries) {
                    console.error('Failed to save pet name after max retries.');
                  } else {
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                  }
                }
              }
            }
          }

          // Check if onboarding is incomplete
          if (currentOnboardingScreen >= 3 && currentOnboardingScreen < 9) {
            // Resume onboarding at saved screen (after auth break at screen 3)
            console.log('Resuming onboarding at screen', currentOnboardingScreen);
            router.replace('/onboarding');
          } else {
            // Onboarding complete, go to home
            router.replace('/');
          }
        } else {
          router.replace('/auth');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/auth');
      }
    };

    handleAuthCallback();
  }, [params]);

  return (
    <View className="flex-1 items-center justify-center bg-neutral-50">
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text className="mt-4 text-neutral-600">Completing sign in...</Text>
    </View>
  );
}

