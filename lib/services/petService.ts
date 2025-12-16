/**
 * Pet Service
 * Handles pet state database operations
 */

import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errors';
import type { PetState } from '@/lib/store/types';

export const petService = {
  /**
   * Load pet state from database
   */
  loadPetState: async (userId: string): Promise<PetState | null> => {
    try {
      const { data, error } = await supabase
        .from('pet_states')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        await handleError(error, {
          operation: 'load_pet_state',
          component: 'pet-service',
          metadata: { userId },
        });
        return null;
      }

      if (data) {
        return {
          stage: data.current_stage,
          points: data.current_points,
          name: data.name,
          mood: data.mood,
        };
      }

      return null;
    } catch (error) {
      await handleError(error, {
        operation: 'load_pet_state',
        component: 'pet-service',
        metadata: { userId },
      });
      return null;
    }
  },

  /**
   * Save pet state to database
   */
  savePetState: async (userId: string, petState: PetState): Promise<void> => {
    try {
      // Calculate stage from points (always authoritative)
      const calculatedStage = Math.floor(petState.points / 100) + 1;

      const { error } = await supabase
        .from('pet_states')
        .upsert(
          {
            user_id: userId,
            current_stage: calculatedStage,
            current_points: petState.points,
            name: petState.name,
            mood: petState.mood,
          },
          {
            onConflict: 'user_id',
          }
        );

      if (error) {
        await handleError(error, {
          operation: 'save_pet_state',
          component: 'pet-service',
          metadata: { userId, petState },
        });
        throw error;
      }
    } catch (error) {
      const appError = await handleError(error, {
        operation: 'save_pet_state',
        component: 'pet-service',
        metadata: { userId, petState },
      });
      throw appError;
    }
  },
};


