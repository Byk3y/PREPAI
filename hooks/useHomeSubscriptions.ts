/**
 * Hook for managing real-time Supabase subscriptions on the home screen
 * Handles notebooks and subscription updates
 */

import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';

/**
 * Hook to set up real-time subscriptions for notebooks and user subscriptions
 * Prevents flash during navigation by checking isNavigatingRef
 */
export function useHomeSubscriptions(isNavigatingRef: MutableRefObject<boolean>) {
  const { authUser, loadNotebooks } = useStore();

  // Real-time notebook updates
  useEffect(() => {
    if (!authUser) return;

    const channel = supabase
      .channel('notebooks-list')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notebooks',
          filter: `user_id=eq.${authUser.id}`,
        },
        async () => {
          if (!isNavigatingRef.current) {
            await loadNotebooks();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notebooks',
          filter: `user_id=eq.${authUser.id}`,
        },
        async () => {
          await loadNotebooks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Note: isNavigatingRef is intentionally omitted from deps - refs are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, loadNotebooks]);

  // Real-time subscription updates
  useEffect(() => {
    if (!authUser) return;

    const { loadSubscription } = useStore.getState();
    const channel = supabase
      .channel('subscription-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${authUser.id}`,
        },
        async () => {
          // Reload subscription when it's created
          await loadSubscription(authUser.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${authUser.id}`,
        },
        async () => {
          // Reload subscription when it changes
          await loadSubscription(authUser.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser]);
}

