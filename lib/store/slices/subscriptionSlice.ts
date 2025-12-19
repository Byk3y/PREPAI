/**
 * Subscription slice - Subscription and trial state management
 * Fetches subscription/trial data from user_subscriptions table
 */

import type { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
import { setUserProperties, setSuperProperties } from '@/lib/services/analyticsService';
import { getDaysUntilExpiration } from '@/lib/services/subscriptionService';

export interface SubscriptionSlice {
  tier: 'trial' | 'premium' | null;
  status: 'active' | 'canceled' | 'expired' | null;
  trialEndsAt: string | null;  // ISO timestamp
  trialStartedAt: string | null;
  studioJobsUsed: number;
  audioJobsUsed: number;
  studioJobsLimit: number;  // 5 for trial, Infinity for premium
  audioJobsLimit: number;   // 3 for trial, Infinity for premium
  isExpired: boolean;
  subscriptionSyncedAt: number | null;

  loadSubscription: (userId: string) => Promise<void>;
  setSubscription: (data: Partial<SubscriptionSlice>) => void;
}

export const createSubscriptionSlice: StateCreator<
  SubscriptionSlice & { authUser: any },
  [],
  [],
  SubscriptionSlice
> = (set, get) => ({
  tier: null,
  status: null,
  trialEndsAt: null,
  trialStartedAt: null,
  studioJobsUsed: 0,
  audioJobsUsed: 0,
  studioJobsLimit: 5,  // Default to trial limits
  audioJobsLimit: 3,
  isExpired: false,
  subscriptionSyncedAt: null,

  setSubscription: (updates) =>
    set((state) => ({
      ...updates,
    })),

  loadSubscription: async (userId: string) => {
    try {
      // Fetch subscription data from user_subscriptions table
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('tier, status, trial_ends_at, trial_started_at, trial_studio_jobs_used, trial_audio_jobs_used')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Check if this is a "no rows" error (expected for new users) vs actual error
        if (error.code === 'PGRST116') {
          // No subscription record found - this is expected for new users
          // The trigger should create one, but we'll set defaults until it does
          set({
            tier: 'trial',
            status: 'active',
            trialEndsAt: null,
            trialStartedAt: null,
            studioJobsUsed: 0,
            audioJobsUsed: 0,
            studioJobsLimit: 5,
            audioJobsLimit: 3,
            isExpired: false,
            subscriptionSyncedAt: Date.now(),
          });
          
          // Set default Mixpanel user properties (omit null values)
          setUserProperties({
            tier: 'trial',
            subscription_status: 'active',
            is_expired: false,
          });
          
          // Set super properties (included in all events)
          setSuperProperties({
            tier: 'trial',
            is_expired: false,
          });
          return;
        }

        // Actual error (network, permission, etc.)
        console.error('Error loading subscription:', error);

        // Set restrictive default state on error (fail-secure)
        // Default to expired trial to prevent unauthorized access if subscription check fails
        set({
          tier: 'trial',
          status: 'expired',
          trialEndsAt: null,
          trialStartedAt: null,
          studioJobsUsed: 0,
          audioJobsUsed: 0,
          studioJobsLimit: 5,
          audioJobsLimit: 3,
          isExpired: true,
          subscriptionSyncedAt: Date.now(),
        });
        
        // Set default Mixpanel user properties (omit null values)
        setUserProperties({
          tier: 'trial',
          subscription_status: 'expired',
          is_expired: true,
        });
        
        // Set super properties (included in all events)
        setSuperProperties({
          tier: 'trial',
          is_expired: true,
        });
        return;
      }

      if (data) {
        // Calculate if expired
        const now = new Date();
        const trialEnds = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
        const isExpired =
          data.status === 'expired' ||
          (data.tier === 'trial' && trialEnds && now > trialEnds);

        // Set quota limits based on tier
        const studioJobsLimit = data.tier === 'premium' ? Infinity : 5;
        const audioJobsLimit = data.tier === 'premium' ? Infinity : 3;

        set({
          tier: data.tier as 'trial' | 'premium',
          status: data.status as 'active' | 'canceled' | 'expired',
          trialEndsAt: data.trial_ends_at,
          trialStartedAt: data.trial_started_at,
          studioJobsUsed: data.trial_studio_jobs_used || 0,
          audioJobsUsed: data.trial_audio_jobs_used || 0,
          studioJobsLimit,
          audioJobsLimit,
          isExpired,
          subscriptionSyncedAt: Date.now(),
        });

        // Update Mixpanel user properties (omit null values)
        const trialDaysRemaining = data.tier === 'trial' && data.trial_ends_at 
          ? getDaysUntilExpiration(data.trial_ends_at) 
          : null;
        
        const userProps: Record<string, any> = {
          tier: data.tier,
          subscription_status: data.status,
          is_expired: isExpired,
        };
        
        // Only include trial_days_remaining if it's not null
        if (trialDaysRemaining !== null) {
          userProps.trial_days_remaining = trialDaysRemaining;
        }
        
        setUserProperties(userProps);
        
        // Set super properties (included in all events)
        setSuperProperties({
          tier: data.tier,
          is_expired: isExpired,
        });
      }
    } catch (error) {
      console.error('Error loading subscription:', error);

      // Set restrictive default state on error (fail-secure)
      // Default to expired trial to prevent unauthorized access if subscription check fails
      set({
        tier: 'trial',
        status: 'expired',
        trialEndsAt: null,
        trialStartedAt: null,
        studioJobsUsed: 0,
        audioJobsUsed: 0,
        studioJobsLimit: 5,
        audioJobsLimit: 3,
        isExpired: true,
        subscriptionSyncedAt: Date.now(),
      });
      
      // Set default Mixpanel user properties (omit null values)
      setUserProperties({
        tier: 'trial',
        subscription_status: 'expired',
        is_expired: true,
      });
      
      // Set super properties (included in all events)
      setSuperProperties({
        tier: 'trial',
        is_expired: true,
      });
    }
  },
});
