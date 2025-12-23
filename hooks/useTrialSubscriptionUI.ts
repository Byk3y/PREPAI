/**
 * Hook for managing trial/subscription UI state
 * Handles trial reminders, upgrade modals, and limited access banners
 */

import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '@/lib/store';
import { useUpgrade } from '@/lib/hooks/useUpgrade';
import {
  getDaysUntilExpiration,
  shouldShowTrialReminder,
  shouldShowLimitedAccessBanner,
  getAccessibleNotebookIds,
} from '@/lib/services/subscriptionService';
import { SUBSCRIPTION_CONSTANTS } from '@/lib/constants';
import type { Notebook } from '@/lib/store';

/**
 * Hook to manage all trial/subscription UI state
 */
export function useTrialSubscriptionUI(notebooks: Notebook[]) {
  const {
    authUser,
    isInitialized,
    tier,
    status,
    trialEndsAt,
    trialStartedAt,
    studioJobsUsed,
    audioJobsUsed,
    studioJobsLimit,
    audioJobsLimit,
    subscriptionSyncedAt,
    isExpired,
    user,
  } = useStore();

  const [showTrialReminder, setShowTrialReminder] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const {
    trackReminderShown,
    trackUpgradeModalShown,
    trackLimitedAccessBannerShown,
  } = useUpgrade();

  // Create full subscription object matching SubscriptionSlice interface
  const subscription = useMemo(
    () => ({
      tier,
      status,
      trialEndsAt,
      trialStartedAt,
      studioJobsUsed,
      audioJobsUsed,
      studioJobsLimit,
      audioJobsLimit,
      isExpired,
      subscriptionSyncedAt,
    }),
    [
      tier,
      status,
      trialEndsAt,
      trialStartedAt,
      studioJobsUsed,
      audioJobsUsed,
      studioJobsLimit,
      audioJobsLimit,
      isExpired,
      subscriptionSyncedAt,
    ]
  );

  const daysRemaining = getDaysUntilExpiration(trialEndsAt);
  const showLimitedAccess = shouldShowLimitedAccessBanner(subscription);

  // Calculate accessible notebook IDs and counts
  const accessibleIds = useMemo(
    () =>
      getAccessibleNotebookIds(
        notebooks,
        SUBSCRIPTION_CONSTANTS.LIMITED_ACCESS_NOTEBOOK_COUNT
      ),
    [notebooks]
  );

  const accessibleCount = accessibleIds.length;
  const totalCount = notebooks.length;

  // Check if trial reminder should be shown
  useEffect(() => {
    const checkTrialReminder = async () => {
      if (shouldShowTrialReminder(subscription)) {
        const dismissed = await AsyncStorage.getItem(
          SUBSCRIPTION_CONSTANTS.TRIAL_REMINDER_DISMISSED_KEY
        );
        const shouldShow = !dismissed;
        setShowTrialReminder(shouldShow);
        if (shouldShow) {
          trackReminderShown(daysRemaining);
        }
      } else {
        setShowTrialReminder(false);
        // Clear dismissal flag when trial status changes (e.g., user upgrades, trial expires)
        // This ensures the reminder can show again if conditions are met
        await AsyncStorage.removeItem(
          SUBSCRIPTION_CONSTANTS.TRIAL_REMINDER_DISMISSED_KEY
        );
      }
    };
    checkTrialReminder();
  }, [
    tier,
    status,
    trialEndsAt,
    isExpired,
    subscription,
    daysRemaining,
    trackReminderShown,
  ]);

  // Check if trial expired modal should be shown on first app open after expiration
  useEffect(() => {
    const checkTrialExpiredModal = async () => {
      // Only show if: trial expired, not premium, and not already shown
      if (isExpired && tier !== 'premium' && authUser && isInitialized) {
        const alreadyShown = await AsyncStorage.getItem(
          SUBSCRIPTION_CONSTANTS.TRIAL_EXPIRED_MODAL_SHOWN_KEY
        );
        if (!alreadyShown) {
          setShowUpgradeModal(true);
          trackUpgradeModalShown('trial_expired');
          // Mark as shown (but don't persist forever - allow it to show again if user upgrades then downgrades)
          await AsyncStorage.setItem(
            SUBSCRIPTION_CONSTANTS.TRIAL_EXPIRED_MODAL_SHOWN_KEY,
            'true'
          );
        }
      } else if (tier === 'premium' || !isExpired) {
        // Clear the flag if user upgrades or trial becomes active again
        await AsyncStorage.removeItem(
          SUBSCRIPTION_CONSTANTS.TRIAL_EXPIRED_MODAL_SHOWN_KEY
        );
      }
    };
    checkTrialExpiredModal();
  }, [isExpired, tier, authUser, isInitialized, trackUpgradeModalShown]);

  // Track limited access banner shown
  useEffect(() => {
    if (showLimitedAccess) {
      trackLimitedAccessBannerShown();
    }
  }, [showLimitedAccess, trackLimitedAccessBannerShown]);

  return {
    showTrialReminder,
    showUpgradeModal,
    showLimitedAccess,
    daysRemaining,
    accessibleNotebookIds: accessibleIds,
    accessibleCount,
    totalCount,
    setShowTrialReminder,
    setShowUpgradeModal,
  };
}







