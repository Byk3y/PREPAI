/**
 * Subscription Service - Helper functions for subscription/trial logic
 */

import type { SubscriptionSlice } from '@/lib/store/slices/subscriptionSlice';

/**
 * Check if trial is active (not expired and tier='trial')
 */
export function isTrialActive(subscription: SubscriptionSlice): boolean {
  return (
    subscription.tier === 'trial' &&
    subscription.status === 'active' &&
    !subscription.isExpired
  );
}

/**
 * Get days until trial expiration (10-day trial period)
 * Returns 0 if expired or no trial end date
 */
export function getDaysUntilExpiration(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;

  const now = new Date();
  const endDate = new Date(trialEndsAt);
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Limit reason types
 */
export type LimitReason = 
  | 'trial_expired' 
  | 'quota_studio_exhausted' 
  | 'quota_audio_exhausted'
  | 'subscription_expired'
  | null;

/**
 * Result of checking if user can create content
 */
export interface ContentCreationCheck {
  canCreate: boolean;
  reason: LimitReason;
  daysRemaining?: number;
  quotaUsed?: number;
  quotaLimit?: number;
}

/**
 * Check if user can create notebooks/content
 * Returns detailed result with specific reason if blocked
 */
export function checkCanCreateContent(
  tier: 'trial' | 'premium' | null,
  status: 'active' | 'canceled' | 'expired' | null,
  isExpired: boolean,
  trialEndsAt?: string | null
): ContentCreationCheck {
  // Premium users can always create (even if status='canceled', until period ends)
  if (tier === 'premium' && status !== 'expired') {
    return { canCreate: true, reason: null };
  }

  // If subscription expired
  if (status === 'expired') {
    return { canCreate: false, reason: 'subscription_expired' };
  }

  // Trial users can create if not expired
  if (tier === 'trial' && !isExpired) {
    const daysRemaining = trialEndsAt ? getDaysUntilExpiration(trialEndsAt) : 0;
    return { canCreate: true, reason: null, daysRemaining };
  }

  // Trial expired
  if (tier === 'trial' && isExpired) {
    return { canCreate: false, reason: 'trial_expired' };
  }

  // All other cases: cannot create
  return { canCreate: false, reason: 'trial_expired' };
}

/**
 * Check if user can create notebooks/content (simple boolean version for backward compatibility)
 * Returns false if: status='expired' OR (tier='trial' AND trial expired)
 */
export function canCreateContent(
  tier: 'trial' | 'premium' | null,
  status: 'active' | 'canceled' | 'expired' | null,
  isExpired: boolean
): boolean {
  return checkCanCreateContent(tier, status, isExpired).canCreate;
}

/**
 * Check if user can access notebook (for limited access mode)
 * After trial expires, users can only access notebooks in the accessibleIds array
 */
export function canAccessNotebook(
  notebookId: string,
  accessibleIds: string[]
): boolean {
  return accessibleIds.includes(notebookId);
}

/**
 * Result of checking quota availability
 */
export interface QuotaCheck {
  hasQuota: boolean;
  reason: LimitReason;
  quotaUsed?: number;
  quotaLimit?: number;
  daysRemaining?: number;
}

/**
 * Check if quota is available for studio/audio jobs with detailed reason
 * Returns detailed result with specific reason if blocked
 */
export function checkQuotaRemaining(
  jobType: 'studio' | 'audio',
  subscription: SubscriptionSlice
): QuotaCheck {
  // Premium users have unlimited quota (unless status is 'expired')
  if (subscription.tier === 'premium' && subscription.status !== 'expired') {
    return { hasQuota: true, reason: null };
  }

  // If subscription expired
  if (subscription.status === 'expired') {
    return { hasQuota: false, reason: 'subscription_expired' };
  }

  // If trial expired, no quota available
  if (subscription.isExpired) {
    const daysRemaining = subscription.trialEndsAt 
      ? getDaysUntilExpiration(subscription.trialEndsAt) 
      : 0;
    return { hasQuota: false, reason: 'trial_expired', daysRemaining };
  }

  // Check quota for trial users
  if (jobType === 'studio') {
    const used = subscription.studioJobsUsed || 0;
    const limit = subscription.studioJobsLimit || 5;
    if (used >= limit) {
      return { 
        hasQuota: false, 
        reason: 'quota_studio_exhausted',
        quotaUsed: used,
        quotaLimit: limit
      };
    }
    return { hasQuota: true, reason: null, quotaUsed: used, quotaLimit: limit };
  } else if (jobType === 'audio') {
    const used = subscription.audioJobsUsed || 0;
    const limit = subscription.audioJobsLimit || 3;
    if (used >= limit) {
      return { 
        hasQuota: false, 
        reason: 'quota_audio_exhausted',
        quotaUsed: used,
        quotaLimit: limit
      };
    }
    return { hasQuota: true, reason: null, quotaUsed: used, quotaLimit: limit };
  }

  return { hasQuota: false, reason: 'trial_expired' };
}

/**
 * Check if quota is available for studio/audio jobs (simple boolean version for backward compatibility)
 * Returns true if user has remaining quota OR is premium
 * Also checks if trial is expired - expired trials cannot use quota
 */
export function hasQuotaRemaining(
  jobType: 'studio' | 'audio',
  subscription: SubscriptionSlice
): boolean {
  return checkQuotaRemaining(jobType, subscription).hasQuota;
}

/**
 * Get remaining quota for a job type
 * Returns Infinity for premium users (unless expired), calculated remaining for trial
 */
export function getRemainingQuota(
  jobType: 'studio' | 'audio',
  subscription: SubscriptionSlice
): number {
  // Premium users have unlimited quota (unless expired)
  if (subscription.tier === 'premium' && subscription.status !== 'expired' && !subscription.isExpired) {
    return Infinity;
  }

  // If subscription expired, no quota
  if (subscription.status === 'expired' || subscription.isExpired) {
    return 0;
  }

  // Calculate remaining for trial users
  if (jobType === 'studio') {
    return Math.max(0, subscription.studioJobsLimit - subscription.studioJobsUsed);
  } else if (jobType === 'audio') {
    return Math.max(0, subscription.audioJobsLimit - subscription.audioJobsUsed);
  }

  return 0;
}

/**
 * Check if user should see trial reminder
 * Shows when: tier='trial', days remaining <= 3 and > 0, not expired
 */
export function shouldShowTrialReminder(subscription: SubscriptionSlice): boolean {
  if (subscription.tier !== 'trial' || subscription.isExpired) {
    return false;
  }

  const daysRemaining = getDaysUntilExpiration(subscription.trialEndsAt);
  return daysRemaining <= 3 && daysRemaining > 0;
}

/**
 * Check if user should see limited access banner
 * Shows when: trial expired and not premium
 */
export function shouldShowLimitedAccessBanner(subscription: SubscriptionSlice): boolean {
  return subscription.isExpired && subscription.tier !== 'premium';
}

/**
 * Get accessible notebook IDs for limited access mode
 * Returns the IDs of the N most recent notebooks (sorted by createdAt descending)
 * Used when trial has expired to limit access to only the most recent notebooks
 */
export function getAccessibleNotebookIds<T extends { id: string; createdAt: string }>(
  notebooks: T[],
  count: number
): string[] {
  return [...notebooks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, count)
    .map((n) => n.id);
}
