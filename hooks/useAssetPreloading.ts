/**
 * Hook for preloading critical assets (pet images)
 * Improves performance by loading assets before they're needed
 */

import { useEffect } from 'react';
import { Image } from 'react-native';

export function useAssetPreloading() {
  useEffect(() => {
    const preloadAssets = async () => {
      try {
        const stage1 = require('@/assets/pets/stage-1/full-view.png');
        const stage1Dying = require('@/assets/pets/stage-1/dying.png');
        const stage2 = require('@/assets/pets/stage-2/silhouette.png');
        const stage2Dying = require('@/assets/pets/stage-2/dying.png');
        const uri1 = Image.resolveAssetSource(stage1).uri;
        const uri1Dying = Image.resolveAssetSource(stage1Dying).uri;
        const uri2 = Image.resolveAssetSource(stage2).uri;
        const uri2Dying = Image.resolveAssetSource(stage2Dying).uri;
        await Promise.all([
          Image.prefetch(uri1),
          Image.prefetch(uri1Dying),
          Image.prefetch(uri2),
          Image.prefetch(uri2Dying)
        ]);
      } catch (error) {
        // Error already handled by centralized system
      }
    };

    preloadAssets();
  }, []);
}










