/**
 * Network Context - Global network connectivity state management
 * Provides real-time network status detection and offline handling
 * Best Practice 2025: Use NetInfo for proactive offline detection
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

export interface NetworkContextValue {
    isConnected: boolean;
    isInternetReachable: boolean | null;
    connectionType: string | null;
    isOffline: boolean;
    lastOnlineAt: number | null;
    checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextValue>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
    isOffline: false,
    lastOnlineAt: null,
    checkConnection: async () => true,
});

export function useNetwork(): NetworkContextValue {
    return useContext(NetworkContext);
}

interface NetworkProviderProps {
    children: React.ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
    const [isConnected, setIsConnected] = useState(true);
    const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
    const [connectionType, setConnectionType] = useState<string | null>(null);
    const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(Date.now());

    const wasConnectedRef = useRef(true);

    // Derived state: consider offline if not connected OR internet not reachable
    const isOffline = !isConnected || isInternetReachable === false;

    const handleNetworkChange = useCallback((state: NetInfoState) => {
        const connected = state.isConnected ?? false;
        const reachable = state.isInternetReachable;

        setIsConnected(connected);
        setIsInternetReachable(reachable);
        setConnectionType(state.type);

        // Production Logging & Analytics
        if (connected && reachable !== false && !wasConnectedRef.current) {
            setLastOnlineAt(Date.now());
            if (__DEV__) console.log('[Network] 🌐 Connection restored');
        } else if (!connected || reachable === false) {
            if (__DEV__) console.log('[Network] 📴 Connection lost');
        }

        wasConnectedRef.current = connected && reachable !== false;
    }, []);

    const checkConnection = useCallback(async (): Promise<boolean> => {
        try {
            const state = await NetInfo.fetch();
            handleNetworkChange(state);
            return state.isConnected === true && state.isInternetReachable !== false;
        } catch (error) {
            console.error('[Network] Error checking connection:', error);
            return false;
        }
    }, [handleNetworkChange]);

    useEffect(() => {
        // Initial fetch
        NetInfo.fetch().then(handleNetworkChange);

        // Subscribe to network changes
        const unsubscribe: NetInfoSubscription = NetInfo.addEventListener(handleNetworkChange);

        return () => {
            unsubscribe();
        };
    }, [handleNetworkChange]);

    const value: NetworkContextValue = {
        isConnected,
        isInternetReachable,
        connectionType,
        isOffline,
        lastOnlineAt,
        checkConnection,
    };

    return (
        <NetworkContext.Provider value={value}>
            {children}
        </NetworkContext.Provider>
    );
}
