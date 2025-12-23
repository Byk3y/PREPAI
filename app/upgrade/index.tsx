/**
 * Upgrade Screen
 * Consolidated to use the new playful PaywallScreen
 */

import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { PaywallScreen } from '@/components/upgrade/PaywallScreen';
import { useUpgrade } from '@/lib/hooks/useUpgrade';

export default function UpgradeScreen() {
  const router = useRouter();
  const { trackUpgradeScreenViewed } = useUpgrade();

  // Track when upgrade screen is viewed
  useEffect(() => {
    trackUpgradeScreenViewed();
  }, [trackUpgradeScreenViewed]);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handlePurchaseSuccess = () => {
    router.replace('/');
  };

  return (
    <PaywallScreen
      onClose={handleClose}
      onPurchaseSuccess={handlePurchaseSuccess}
      source="upgrade_screen"
      showProgress={true}
    />
  );
}
