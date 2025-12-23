/**
 * usePaywall Hook
 * Provides a simple API to show the custom paywall from anywhere in the app
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';

interface UsePaywallOptions {
    source?: string;
}

interface UsePaywallReturn {
    showPaywall: () => void;
    isPaywallVisible: boolean;
}

/**
 * Hook to show the custom paywall
 * 
 * Usage:
 * ```
 * const { showPaywall } = usePaywall({ source: 'settings' });
 * 
 * <Button onPress={showPaywall} title="Upgrade" />
 * ```
 */
export function usePaywall(options: UsePaywallOptions = {}): UsePaywallReturn {
    const router = useRouter();
    const [isPaywallVisible, setIsPaywallVisible] = useState(false);
    const { source = 'paywall' } = options;

    const showPaywall = useCallback(() => {
        setIsPaywallVisible(true);
        router.push({
            pathname: '/paywall',
            params: { source },
        });
    }, [router, source]);

    return {
        showPaywall,
        isPaywallVisible,
    };
}

export default usePaywall;
