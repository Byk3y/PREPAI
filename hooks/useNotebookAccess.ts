/**
 * Hook for managing notebook access control based on subscription tier
 */

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { canAccessNotebook, getAccessibleNotebookIds } from '@/lib/services/subscriptionService';
import { SUBSCRIPTION_CONSTANTS } from '@/lib/constants';

/**
 * Hook to check if notebook is accessible and manage locked overlay state
 * @param id - Notebook ID
 * @returns Object with showLockedOverlay state and setter
 */
export function useNotebookAccess(id: string | undefined) {
  const { notebooks, tier, isExpired } = useStore();
  const [showLockedOverlay, setShowLockedOverlay] = useState(false);

  useEffect(() => {
    if (!id || !isExpired || tier === 'premium') {
      // Reset overlay if user has premium or trial is active
      setShowLockedOverlay(false);
      return;
    }

    // Get the most recent notebooks (accessible in limited access mode)
    const accessibleIds = getAccessibleNotebookIds(
      notebooks,
      SUBSCRIPTION_CONSTANTS.LIMITED_ACCESS_NOTEBOOK_COUNT
    );

    // Check if this notebook is accessible
    const canAccess = canAccessNotebook(id, accessibleIds);

    setShowLockedOverlay(!canAccess);
  }, [id, isExpired, tier, notebooks]);

  return { showLockedOverlay, setShowLockedOverlay };
}

