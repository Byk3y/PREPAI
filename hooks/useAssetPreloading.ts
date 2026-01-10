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
        const stage3Full = require('@/assets/pets/stage-3/full-view.png');
        const stage3Silhouette = require('@/assets/pets/stage-3/silhouette.png');
        const stage3Bubble = require('@/assets/pets/stage-3/bubble.png');
        const stage3Dying = require('@/assets/pets/stage-3/dying.png');

        const uri1 = Image.resolveAssetSource(stage1).uri;
        const uri1Dying = Image.resolveAssetSource(stage1Dying).uri;
        const uri2 = Image.resolveAssetSource(stage2).uri;
        const uri2Dying = Image.resolveAssetSource(stage2Dying).uri;
        const uri3Full = Image.resolveAssetSource(stage3Full).uri;
        const uri3Silhouette = Image.resolveAssetSource(stage3Silhouette).uri;
        const uri3Bubble = Image.resolveAssetSource(stage3Bubble).uri;
        const uri3Dying = Image.resolveAssetSource(stage3Dying).uri;

        await Promise.all([
          Image.prefetch(uri1),
          Image.prefetch(uri1Dying),
          Image.prefetch(uri2),
          Image.prefetch(uri2Dying),
          Image.prefetch(uri3Full),
          Image.prefetch(uri3Silhouette),
          Image.prefetch(uri3Bubble),
          Image.prefetch(uri3Dying)
        ]);
      } catch (error) {
        // Error already handled by centralized system
      }
    };

    preloadAssets();
  }, []);
}










