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
        const stage2 = require('@/assets/pets/stage-2/silhouette.png');
        const uri1 = Image.resolveAssetSource(stage1).uri;
        const uri2 = Image.resolveAssetSource(stage2).uri;
        await Promise.all([Image.prefetch(uri1), Image.prefetch(uri2)]);
      } catch (error) {
        // Error already handled by centralized system
      }
    };

    preloadAssets();
  }, []);
}






