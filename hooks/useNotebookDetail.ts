/**
 * Hook for loading and managing notebook detail data
 */

import { useState, useEffect } from 'react';
import { useStore, type Notebook } from '@/lib/store';
import { notebookService } from '@/lib/services/notebookService';

/**
 * Hook to load and manage notebook detail state
 * @param id - Notebook ID
 * @returns Object with notebook, loading state, and setter
 */
export function useNotebookDetail(id: string | undefined) {
  const { notebooks, loadNotebooks, setNotebooks } = useStore();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotebook = async () => {
      if (!id) {
        setNotebook(null);
        setLoading(false);
        return;
      }

      // If notebooks not loaded yet, load them
      if (notebooks.length === 0) {
        await loadNotebooks();
      }

      // Get fresh notebooks from store after loading (avoid stale closure)
      const currentNotebooks = useStore.getState().notebooks;
      const found = currentNotebooks.find((n) => n.id === id);

      if (found) {
        setNotebook(found);
        setLoading(false);
        return;
      }

      // Notebook not found in store - try fetching directly from database
      // This handles race conditions where the notebook was just created
      // but hasn't been loaded into the store yet
      try {
        const fetchedNotebook = await notebookService.getNotebookById(id);
        if (fetchedNotebook) {
          setNotebook(fetchedNotebook);
          // Also update the store with the fetched notebook
          setNotebooks([fetchedNotebook, ...currentNotebooks]);
        } else {
          setNotebook(null);
        }
      } catch (error) {
        console.error('Error fetching notebook from database:', error);
        setNotebook(null);
      } finally {
        setLoading(false);
      }
    };

    loadNotebook();
    // Only depend on id - don't re-run when notebooks array changes
    // Real-time updates will handle state changes directly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keep local notebook state in sync with global store for optimistic updates
  useEffect(() => {
    if (!id || notebooks.length === 0) return;

    const found = notebooks.find(n => n.id === id);
    if (found) {
      setNotebook(found);
    }
  }, [id, notebooks]);

  return { notebook, loading, setNotebook };
}

