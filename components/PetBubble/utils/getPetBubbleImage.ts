import { ImageSourcePropType } from 'react-native';
import { PET_BUBBLE_IMAGES } from '../constants';

/**
 * Get the correct bubble image for current stage
 * Clamps stage to available stages (1-2) and provides fallback
 */
export function getPetBubbleImage(stage: number): ImageSourcePropType {
  // Clamp to available stages 1-2
  const currentStage = Math.min(Math.max(stage, 1), 2);
  return PET_BUBBLE_IMAGES[currentStage] || PET_BUBBLE_IMAGES[1];
}

