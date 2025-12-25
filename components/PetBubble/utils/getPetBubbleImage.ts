import { ImageSourcePropType } from 'react-native';
import { PET_BUBBLE_IMAGES, PET_DYING_IMAGES } from '../constants';

/**
 * Get the correct bubble image for current stage
 * Clamps stage to available stages (1-2) and provides fallback
 */
export function getPetBubbleImage(stage: number, isDying: boolean = false): ImageSourcePropType {
  // Clamp to available stages 1-2
  const currentStage = Math.min(Math.max(stage, 1), 2);

  if (isDying) {
    return PET_DYING_IMAGES[currentStage] || PET_DYING_IMAGES[1];
  }

  return PET_BUBBLE_IMAGES[currentStage] || PET_BUBBLE_IMAGES[1];
}







