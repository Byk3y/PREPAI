/**
 * Hook for notebook list filtering and sorting logic
 */

import { useMemo } from 'react';
import type { Notebook } from '@/lib/store';
import { getAccessibleNotebookIds } from '@/lib/services/subscriptionService';
import { SUBSCRIPTION_CONSTANTS } from '@/lib/constants';

interface UseNotebookListParams {
  notebooks: Notebook[];
  showLimitedAccess: boolean;
}

/**
 * Hook to handle notebook sorting and filtering
 */
export function useNotebookList({
  notebooks,
  showLimitedAccess,
}: UseNotebookListParams) {
  // Sort notebooks by creation date (most recent first)
  const sortedNotebooks = useMemo(() => {
    return [...notebooks].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [notebooks]);

  // Calculate accessible notebook IDs
  const accessibleIds = useMemo(
    () =>
      getAccessibleNotebookIds(
        sortedNotebooks,
        SUBSCRIPTION_CONSTANTS.LIMITED_ACCESS_NOTEBOOK_COUNT
      ),
    [sortedNotebooks]
  );

  // Filter to accessible notebooks if in limited access mode
  const accessibleNotebooks = useMemo(() => {
    if (showLimitedAccess) {
      return sortedNotebooks.filter((n) => accessibleIds.includes(n.id));
    }
    return sortedNotebooks;
  }, [sortedNotebooks, showLimitedAccess, accessibleIds]);

  return {
    sortedNotebooks,
    accessibleNotebooks,
    accessibleIds,
  };
}







