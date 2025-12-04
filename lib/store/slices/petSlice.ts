/**
 * Pet slice - Pet state management with Supabase persistence
 */

import type { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { PetState, SupabaseUser } from '../types';

export interface PetSlice {
  petState: PetState;
  setPetState: (petState: Partial<PetState>) => void;
  addPetXP: (amount: number) => void;
  loadPetState: () => Promise<void>;
}

export const createPetSlice: StateCreator<
  PetSlice & { authUser: SupabaseUser | null },
  [],
  [],
  PetSlice
> = (set, get) => ({
  petState: {
    level: 1,
    xp: 23,
    xpToNext: 100,
    name: 'Sparky',
    mood: 'happy',
  },

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
    }));

    // Persist to database - include all fields so upsert can match on user_id unique constraint
    // Map TypeScript field names to database column names
    try {
      const { error } = await supabase
        .from('pet_states')
        .upsert({
          user_id: authUser.id,
          level: mergedPetState.level,
          xp: mergedPetState.xp,
          xp_to_next: mergedPetState.xpToNext,
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

  addPetXP: async (amount) => {
    const { authUser } = get();
    const state = get();
    const newXP = state.petState.xp + amount;
    const xpToNext = state.petState.xpToNext;

    let newPetState: PetState;

    if (newXP >= xpToNext) {
      // Level up!
      newPetState = {
        ...state.petState,
        level: state.petState.level + 1,
        xp: newXP - xpToNext,
        xpToNext: Math.floor(xpToNext * 1.5), // Increase XP needed for next level
        mood: 'happy',
      };
    } else {
      newPetState = {
        ...state.petState,
        xp: newXP,
      };
    }

    // Update local state
    set({ petState: newPetState });

    // Persist to database
    if (authUser) {
      try {
        const { error } = await supabase
          .from('pet_states')
          .upsert({
            user_id: authUser.id,
            level: newPetState.level,
            xp: newPetState.xp,
            xp_to_next: newPetState.xpToNext,
            mood: newPetState.mood,
          });

        if (error) {
          console.error('Error saving pet XP:', error);
        }
      } catch (error) {
        console.error('Error persisting pet XP:', error);
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
        set({
          petState: {
            level: data.level || 1,
            xp: data.xp || 0,
            xpToNext: data.xp_to_next || 100,
            name: data.name || 'Sparky',
            mood: data.mood || 'happy',
          },
        });
      } else {
        // No pet state exists, create default one using upsert to handle race conditions
        // Upsert will insert if not exists, or update if it does (handles concurrent requests)
        const defaultPetState = get().petState;
        const { data: upsertedData, error: insertError } = await supabase
          .from('pet_states')
          .upsert({
            user_id: authUser.id,
            level: defaultPetState.level,
            xp: defaultPetState.xp,
            xp_to_next: defaultPetState.xpToNext,
            name: defaultPetState.name,
            mood: defaultPetState.mood,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating initial pet state:', insertError);
        } else if (upsertedData) {
          // Update local state with the upserted data
          set({
            petState: {
              level: upsertedData.level || 1,
              xp: upsertedData.xp || 0,
              xpToNext: upsertedData.xp_to_next || 100,
              name: upsertedData.name || 'Sparky',
              mood: upsertedData.mood || 'happy',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error loading pet state:', error);
    }
  },
});
