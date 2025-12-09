/**
 * Pet slice - Pet state management with Supabase persistence
 */

import type { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { PetState, SupabaseUser } from '../types';

// Type for cross-slice access to TaskSlice's checkAndAwardTask
interface TaskSliceAccessor {
  checkAndAwardTask?: (taskKey: string) => Promise<{ success: boolean; newPoints?: number; error?: string }>;
}

export interface PetSlice {
  petState: PetState;
  petStateReady: boolean;
  petStateSyncedAt: number | null;
  petStateUserId: string | null;
  cachedPetState?: PetState;
  cachedPetSyncedAt?: number | null;
  cachedPetUserId?: string | null;
  setPetState: (petState: Partial<PetState>) => Promise<void>;
  addPetPoints: (amount: number) => Promise<void>;
  loadPetState: () => Promise<void>;
  updatePetName: (newName: string) => Promise<void>;
  hydratePetStateFromCache: () => void;
  resetPetState: () => void;
}

export const createPetSlice: StateCreator<
  PetSlice & { authUser: SupabaseUser | null },
  [],
  [],
  PetSlice
> = (set, get) => ({
  petState: {
    stage: 1,
    points: 0,
    name: 'Nova',
    mood: 'happy',
  },
  petStateReady: false,
  petStateSyncedAt: null,
  petStateUserId: null,
  cachedPetState: undefined,
  cachedPetSyncedAt: null,
  cachedPetUserId: null,

  // Renamed from setPetState to handle simple updates, but specific actions like name update should use updatePetName
  setPetState: async (updates) => {
    const { authUser } = get();
    if (!authUser) return;

    // Get current pet state to merge with updates
    const currentPetState = get().petState;

    // Merge current state with updates
    const mergedPetState = { ...currentPetState, ...updates };

    // Update local state
    set((state) => ({
      petState: mergedPetState,
      petStateReady: true,
      petStateSyncedAt: Date.now(),
      petStateUserId: authUser.id,
      cachedPetState: mergedPetState,
      cachedPetSyncedAt: Date.now(),
      cachedPetUserId: authUser.id,
    }));

    try {
      // Calculate stage from points (always authoratative)
      const calculatedStage = Math.floor(mergedPetState.points / 100) + 1;

      const { error } = await supabase
        .from('pet_states')
        .upsert({
          user_id: authUser.id,
          current_stage: calculatedStage,
          current_points: mergedPetState.points,
          name: mergedPetState.name,
          mood: mergedPetState.mood,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving pet state:', error);
      }
    } catch (error) {
      console.error('Error persisting pet state:', error);
    }
  },

  updatePetName: async (newName: string) => {
    const { setPetState } = get();

    // 1. Update state locally and persist
    await setPetState({ name: newName });

    // 2. Check for "Name your pet" task completion
    // We do this here as a convenient trigger point
    // Use typed accessor for cross-slice access to TaskSlice
    const state = get() as unknown as TaskSliceAccessor;
    if (newName !== 'Pet' && newName !== 'Nova' && typeof state.checkAndAwardTask === 'function') {
      await state.checkAndAwardTask('name_pet');
    }
  },

  addPetPoints: async (amount) => {
    const { authUser } = get();
    const state = get();

    // Clamp to prevent negative points (per spec Section 9: Negative Points Protection)
    const newPoints = Math.max(0, state.petState.points + amount);

    // Calculate stage from total points (fixed 100 points per stage)
    // Stage 1: 0-100, Stage 2: 100-200, Stage 3: 200-300, etc.
    const newStage = Math.floor(newPoints / 100) + 1;
    const oldStage = Math.floor(state.petState.points / 100) + 1;

    const newPetState: PetState = {
      ...state.petState,
      points: newPoints,
      stage: newStage,
      // Set mood to happy if stage increased
      mood: newStage > oldStage ? 'happy' : state.petState.mood,
    };

    // Update local state
    set({ petState: newPetState });

    // Persist to database
    if (authUser) {
      try {
        const { error } = await supabase
          .from('pet_states')
          .upsert({
            user_id: authUser.id,
            current_stage: newStage,
            current_points: newPoints,
            mood: newPetState.mood,
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Error saving pet points:', error);
        }
      } catch (error) {
        console.error('Error persisting pet points:', error);
      }
    }
  },

  loadPetState: async () => {
    const { authUser } = get();
    if (!authUser) return;

    try {
      const { data, error } = await supabase
        .from('pet_states')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error loading pet state:', error);
        return;
      }

      if (data) {
        // Calculate stage from points (fixed 100 points per stage)
        const points = data.current_points || 0;
        const stage = Math.floor(points / 100) + 1;

        set({
          petState: {
            stage: stage,
            points: points,
            name: data.name || 'Nova',
            mood: data.mood || 'happy',
          },
          petStateReady: true,
          petStateSyncedAt: Date.now(),
          petStateUserId: authUser.id,
          cachedPetState: {
            stage: stage,
            points: points,
            name: data.name || 'Nova',
            mood: data.mood || 'happy',
          },
          cachedPetSyncedAt: Date.now(),
          cachedPetUserId: authUser.id,
        });
      } else {
        // No pet state exists, create default one using upsert to handle race conditions
        // Use hardcoded defaults instead of persisted state to prevent cross-user contamination
        const defaultPetState = {
          stage: 1,
          points: 0,
          name: 'Nova',
          mood: 'happy' as const,
        };
        
        const { data: upsertedData, error: insertError } = await supabase
          .from('pet_states')
          .upsert({
            user_id: authUser.id,
            current_stage: defaultPetState.stage,
            current_points: defaultPetState.points,
            name: defaultPetState.name,
            mood: defaultPetState.mood,
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating initial pet state:', insertError);
        } else if (upsertedData) {
          // Update local state with the upserted data
          const points = upsertedData.current_points || 0;
          const stage = Math.floor(points / 100) + 1;

          set({
            petState: {
              stage: stage,
              points: points,
              name: upsertedData.name || 'Nova',
              mood: upsertedData.mood || 'happy',
            },
            petStateReady: true,
            petStateSyncedAt: Date.now(),
            petStateUserId: authUser.id,
            cachedPetState: {
              stage: stage,
              points: points,
              name: upsertedData.name || 'Nova',
              mood: upsertedData.mood || 'happy',
            },
            cachedPetSyncedAt: Date.now(),
            cachedPetUserId: authUser.id,
          });
        } else {
          // Fallback: set default state if upsert didn't return data
          set({
            petState: defaultPetState,
            petStateReady: true,
            petStateSyncedAt: Date.now(),
            petStateUserId: authUser.id,
            cachedPetState: defaultPetState,
            cachedPetSyncedAt: Date.now(),
            cachedPetUserId: authUser.id,
          });
        }
      }
    } catch (error) {
      console.error('Error loading pet state:', error);
    }
  },

  hydratePetStateFromCache: () => {
    const { authUser, cachedPetState, cachedPetUserId, cachedPetSyncedAt } = get();
    if (!authUser) return;
    if (cachedPetState && cachedPetUserId === authUser.id) {
      set({
        petState: cachedPetState,
        petStateReady: true,
        petStateSyncedAt: cachedPetSyncedAt ?? null,
        petStateUserId: cachedPetUserId,
      });
    }
  },

  resetPetState: () => {
    // Reset pet state to defaults (used when user logs out or switches accounts)
    set({
      petState: {
        stage: 1,
        points: 0,
        name: 'Nova',
        mood: 'happy',
      },
      petStateReady: false,
      petStateSyncedAt: null,
      petStateUserId: null,
      cachedPetState: undefined,
      cachedPetSyncedAt: null,
      cachedPetUserId: null,
    });
  },
});
