/**
 * EmptyState - Floating Bubbles Design
 * Shows a pulsing AI core surrounded by floating material bubbles
 * Uses standard Animated API for maximum compatibility
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface EmptyStateProps {
    icon?: string;
    title: string | { base: string; words: string[] };
    description: string | { base: string; words: string[] };
    primaryAction?: {
        label: string;
        onPress: () => void;
    };
    secondaryAction?: {
        icon: string;
        onPress: () => void;
    };
    header?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    primaryAction,
    secondaryAction,
    header,
}) => {
    const insets = useSafeAreaInsets();

    // Animation Values
    const pulseCore = useRef(new Animated.Value(1)).current;
    const fadeContent = useRef(new Animated.Value(0)).current;
    const slideContent = useRef(new Animated.Value(20)).current;

    // Floating Animations for Bubbles
    const float1 = useRef(new Animated.Value(0)).current;
    const float2 = useRef(new Animated.Value(0)).current;
    const float3 = useRef(new Animated.Value(0)).current;
    const float4 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Start Animations
        const startAnimations = () => {
            // 1. Core Pulsing
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseCore, {
                        toValue: 1.05,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseCore, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // 2. Floating Bubbles (Randomized sine wave simulation)
            const createFloatAnimation = (anim: Animated.Value, duration: number, delay: number) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: -15,
                            duration: duration,
                            delay: delay,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 0,
                            duration: duration,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            };

            createFloatAnimation(float1, 3000, 0);
            createFloatAnimation(float2, 4000, 500);
            createFloatAnimation(float3, 3500, 1000);
            createFloatAnimation(float4, 4500, 200);

            // 3. Content Entrance
            Animated.parallel([
                Animated.timing(fadeContent, {
                    toValue: 1,
                    duration: 800,
                    delay: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideContent, {
                    toValue: 0,
                    duration: 800,
                    delay: 300,
                    easing: Easing.out(Easing.back(1.5)),
                    useNativeDriver: true,
                }),
            ]).start();
        };

        startAnimations();
    }, []);

    // Extract base text for simplicity in this version
    const titleText = typeof title === 'string' ? title : title.base.replace('{word}', title.words[0] || 'Learning');
    const descText = typeof description === 'string' ? description : description.base.replace('{word}', description.words[0] || 'interactive');

    return (
        <View className="flex-1" style={{ marginBottom: -insets.bottom }}>
            {/* Background */}
            <LinearGradient
                colors={['#FFFFFF', '#F3F4F6', '#E5E7EB']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            {header && (
                <View style={{ zIndex: 10 }}>
                    {header}
                </View>
            )}

            <View className="flex-1 items-center justify-center">
                {/* Floating Bubbles Visualization */}
                <View style={{ width: 320, height: 320, alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>

                    {/* Bubble 1: PDF (Top Left) */}
                    <Animated.View
                        style={[
                            styles.bubble,
                            {
                                top: 20,
                                left: 40,
                                width: 64,
                                height: 64,
                                backgroundColor: '#FEF2F2', // Red tint
                                transform: [{ translateY: float1 }]
                            }
                        ]}
                    >
                        <MaterialIcons name="picture-as-pdf" size={28} color="#EF4444" />
                    </Animated.View>

                    {/* Bubble 2: Audio (Top Right) */}
                    <Animated.View
                        style={[
                            styles.bubble,
                            {
                                top: 40,
                                right: 40,
                                width: 56,
                                height: 56,
                                backgroundColor: '#F3E8FF', // Purple tint
                                transform: [{ translateY: float2 }]
                            }
                        ]}
                    >
                        <MaterialIcons name="mic" size={24} color="#9333EA" />
                    </Animated.View>

                    {/* Bubble 3: Image (Bottom Left) */}
                    <Animated.View
                        style={[
                            styles.bubble,
                            {
                                bottom: 60,
                                left: 50,
                                width: 52,
                                height: 52,
                                backgroundColor: '#EFF6FF', // Blue tint
                                transform: [{ translateY: float3 }]
                            }
                        ]}
                    >
                        <MaterialIcons name="image" size={22} color="#3B82F6" />
                    </Animated.View>

                    {/* Bubble 4: Text/Notes (Bottom Right) */}
                    <Animated.View
                        style={[
                            styles.bubble,
                            {
                                bottom: 40,
                                right: 60,
                                width: 48,
                                height: 48,
                                backgroundColor: '#FFF7ED', // Orange tint
                                transform: [{ translateY: float4 }]
                            }
                        ]}
                    >
                        <MaterialIcons name="edit-note" size={22} color="#F97316" />
                    </Animated.View>

                    {/* The Core */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={primaryAction?.onPress}
                    >
                        <Animated.View
                            style={[
                                styles.coreContainer,
                                { transform: [{ scale: pulseCore }] }
                            ]}
                        >
                            <LinearGradient
                                colors={['#8B5CF6', '#6D28D9']}
                                style={styles.core}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <MaterialIcons name="auto-awesome" size={40} color="#FFFFFF" />
                            </LinearGradient>
                        </Animated.View>
                    </TouchableOpacity>
                </View>

                {/* Text Content */}
                <Animated.View
                    style={{
                        alignItems: 'center',
                        paddingHorizontal: 32,
                        opacity: fadeContent,
                        transform: [{ translateY: slideContent }]
                    }}
                >
                    <Text
                        style={{ fontFamily: 'SpaceGrotesk-Bold' }}
                        className="text-3xl text-center text-neutral-900 mb-3"
                    >
                        Study Reimagined
                    </Text>
                    <Text
                        style={{ fontFamily: 'SpaceGrotesk-Regular' }}
                        className="text-lg text-center text-neutral-500 mb-8 leading-6"
                    >
                        Experience the future of learning. Transform any material into an interactive mastery engine.
                    </Text>
                </Animated.View>
            </View>

            {/* Actions - Positioned at absolute bottom */}
            {(primaryAction || secondaryAction) && (
                <Animated.View
                    style={{
                        position: 'absolute',
                        bottom: 40,
                        left: 24,
                        right: 24,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        opacity: fadeContent,
                        transform: [{ translateY: slideContent }]
                    }}
                >
                    {secondaryAction && (
                        <TouchableOpacity
                            onPress={secondaryAction.onPress}
                            className="w-14 h-14 rounded-full bg-white items-center justify-center shadow-sm border border-neutral-200"
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3,
                            }}
                        >
                            <MaterialIcons name="camera-alt" size={24} color="#4B5563" />
                        </TouchableOpacity>
                    )}

                    {primaryAction && (
                        <TouchableOpacity
                            onPress={primaryAction.onPress}
                            className="bg-neutral-900 px-8 py-4 rounded-full shadow-lg flex-row items-center gap-2"
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 8,
                            }}
                        >
                            <MaterialIcons name="add" size={20} color="#FFFFFF" />
                            <Text
                                style={{ fontFamily: 'SpaceGrotesk-SemiBold' }}
                                className="text-white text-base"
                            >
                                Add Materials
                            </Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    bubble: {
        position: 'absolute',
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    coreContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 24,
        elevation: 12,
    },
    core: {
        width: '100%',
        height: '100%',
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    }
});
