/**
 * Quota Management for Trial/Premium Users
 * Enforces limits: Trial = 5 Studio jobs + 3 audio jobs
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Loosen generics so any Supabase client instance is accepted (service role or anon)
type AnySupabaseClient = SupabaseClient<any, any, any, any, any>;

export interface QuotaCheck {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number;
  tier?: 'trial' | 'premium';
}

/**
 * Check if user can perform a Studio or Audio job
 * Trial users: 5 Studio jobs + 3 audio jobs total
 * Premium users: unlimited
 */
export async function checkQuota(
  supabase: AnySupabaseClient,
  userId: string,
  jobType: 'studio' | 'audio'
): Promise<QuotaCheck> {
  try {
    // Get user subscription
    const { data: sub, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !sub) {
      return {
        allowed: false,
        reason: 'Subscription not found. Please contact support.',
      };
    }

    // Premium users: unlimited access
    if (sub.tier === 'premium' && sub.status === 'active') {
      return {
        allowed: true,
        tier: 'premium',
      };
    }

    // Trial users: check limits
    if (sub.tier === 'trial') {
      const now = new Date();
      const trialEnd = new Date(sub.trial_ends_at);

      // Check if trial expired
      if (now > trialEnd) {
        return {
          allowed: false,
          reason: 'Your trial has expired. Upgrade to continue using PrepAI!',
          tier: 'trial',
        };
      }

      // Check Studio job limit (5 total)
      if (jobType === 'studio') {
        const used = sub.trial_studio_jobs_used || 0;
        if (used >= 5) {
          return {
            allowed: false,
            reason: 'Trial limit reached (5 Studio jobs). Upgrade to create unlimited flashcards and quizzes!',
            remaining: 0,
            limit: 5,
            tier: 'trial',
          };
        }
        return {
          allowed: true,
          remaining: 5 - used,
          limit: 5,
          tier: 'trial',
        };
      }

      // Check Audio job limit (3 total)
      if (jobType === 'audio') {
        const used = sub.trial_audio_jobs_used || 0;
        if (used >= 3) {
          return {
            allowed: false,
            reason: 'Trial limit reached (3 audio overviews). Upgrade to create unlimited audio summaries!',
            remaining: 0,
            limit: 3,
            tier: 'trial',
          };
        }
        return {
          allowed: true,
          remaining: 3 - used,
          limit: 3,
          tier: 'trial',
        };
      }
    }

    return {
      allowed: false,
      reason: 'Invalid subscription status',
    };
  } catch (error) {
    console.error('Quota check error:', error);
    return {
      allowed: false,
      reason: 'Error checking quota. Please try again.',
    };
  }
}

/**
 * Increment quota usage (after successful job completion)
 * Uses SQL function for atomic increment
 */
export async function incrementQuota(
  supabase: AnySupabaseClient,
  userId: string,
  jobType: 'studio' | 'audio'
): Promise<void> {
  try {
    // Call SQL function (created in Phase 1)
    const { error } = await supabase.rpc('increment_quota', {
      user_id_param: userId,
      quota_type: jobType,
    });

    if (error) {
      console.error('Error incrementing quota:', error);
      throw new Error(`Failed to increment quota: ${error.message}`);
    }
  } catch (error) {
    console.error('incrementQuota error:', error);
    // Don't throw - just log. Job already completed successfully.
    // We don't want to fail the request just because quota increment failed.
  }
}

/**
 * Get user quota info (for frontend display)
 */
export async function getUserQuota(
  supabase: AnySupabaseClient,
  userId: string
): Promise<{
  tier: 'trial' | 'premium';
  studioJobsRemaining: number | null;
  audioJobsRemaining: number | null;
  trialEndsAt: string | null;
  isExpired: boolean;
}> {
  try {
    const { data: sub, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !sub) {
      throw new Error('Subscription not found');
    }

    const now = new Date();
    const trialEnd = new Date(sub.trial_ends_at);
    const isExpired = sub.tier === 'trial' && now > trialEnd;

    return {
      tier: sub.tier,
      studioJobsRemaining:
        sub.tier === 'premium' ? null : Math.max(0, 5 - (sub.trial_studio_jobs_used || 0)),
      audioJobsRemaining:
        sub.tier === 'premium' ? null : Math.max(0, 3 - (sub.trial_audio_jobs_used || 0)),
      trialEndsAt: sub.trial_ends_at,
      isExpired,
    };
  } catch (error) {
    console.error('getUserQuota error:', error);
    throw error;
  }
}
