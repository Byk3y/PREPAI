import React, { useRef, useEffect, useState } from 'react';
import { View, Animated, Easing } from 'react-native';

interface AudioVisualizerProps {
    isPlaying: boolean;
    height?: number;
}

const BAR_COUNT = 9;
const COLORS = [
    '#A78BFA', '#34D399', '#4F5BD5', '#A78BFA', '#34D399',
    '#4F5BD5', '#A78BFA', '#34D399', '#4F5BD5'
];

export const AudioVisualizer = ({ isPlaying, height = 40 }: AudioVisualizerProps) => {
    // Create animated values for each bar
    const barAnims = useRef(
        Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3))
    ).current;

    // Animation references
    const animationsRef = useRef<Animated.CompositeAnimation[]>([]);

    useEffect(() => {
        if (isPlaying) {
            // Start animations for each bar with different timing
            const animations = barAnims.map((anim, index) => {
                // Different duration for each bar for organic feel
                const duration = 300 + (index % 3) * 100;
                const delay = index * 50;

                return Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.timing(anim, {
                            toValue: 0.9 + Math.random() * 0.1,
                            duration: duration,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 0.2 + Math.random() * 0.2,
                            duration: duration + 50,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                    ])
                );
            });

            animationsRef.current = animations;
            animations.forEach(anim => anim.start());
        } else {
            // Stop all animations
            animationsRef.current.forEach(anim => anim.stop());

            // Animate bars to resting position
            barAnims.forEach(anim => {
                Animated.timing(anim, {
                    toValue: 0.15,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            });
        }

        return () => {
            animationsRef.current.forEach(anim => anim.stop());
        };
    }, [isPlaying]);

    const barWidth = 6;
    const barSpacing = 6;
    const maxBarHeight = height * 0.85;

    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height,
            gap: barSpacing,
        }}>
            {barAnims.map((anim, index) => (
                <Animated.View
                    key={index}
                    style={{
                        width: barWidth,
                        height: maxBarHeight,
                        backgroundColor: COLORS[index],
                        borderRadius: barWidth / 2,
                        transform: [{
                            scaleY: anim,
                        }],
                        opacity: 0.8,
                    }}
                />
            ))}
        </View>
    );
};

export default AudioVisualizer;
