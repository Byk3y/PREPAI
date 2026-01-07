/**
 * Offline Banner Component - Redesigned for minimal footprint
 * Compact floating pill that appears when offline
 * Best Practice 2025: Subtle but clear connectivity context
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '@/lib/contexts/NetworkContext';
import { useTheme, getThemeColors } from '@/lib/ThemeContext';

export function OfflineBanner() {
    const { isOffline } = useNetwork();
    const { isDarkMode } = useTheme();
    const colors = getThemeColors(isDarkMode);
    const insets = useSafeAreaInsets();

    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (isOffline) {
            setIsRendered(true);
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 65,
                    friction: 10,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setIsRendered(false);
            });
        }
    }, [isOffline, slideAnim, opacityAnim]);

    if (!isOffline && !isRendered) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: Platform.OS === 'ios' ? insets.top + 8 : 16,
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                },
            ]}
            pointerEvents="none"
        >
            <View style={styles.pill}>
                <Ionicons name="cloud-offline" size={14} color="#FFFFFF" />
                <Text style={styles.text}>Looks like you're offline</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.95)', // Subtle Glassmorphic Red
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 6,
        fontFamily: 'Nunito-Bold',
        letterSpacing: -0.2,
    },
});

