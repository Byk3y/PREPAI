import React, { useRef, useEffect } from 'react';
import { View, Dimensions, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AudioVisualizerProps {
    isPlaying: boolean;
}

export const AudioVisualizer = ({ isPlaying }: AudioVisualizerProps) => {
    // Independent animations for parallax/polyrhythm effect
    const wave1Anim = useRef(new Animated.Value(0)).current;
    const wave2Anim = useRef(new Animated.Value(0)).current;
    const wave3Anim = useRef(new Animated.Value(0)).current;

    // Shared beat/volume pulse
    const beatAnim = useRef(new Animated.Value(0)).current;

    const setupLoop = (anim: Animated.Value, duration: number) => {
        return Animated.loop(
            Animated.timing(anim, {
                toValue: 1,
                duration: duration,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
    };

    useEffect(() => {
        if (isPlaying) {
            // Start independent loops with different prime-ish durations for organic non-repeating feel
            setupLoop(wave1Anim, 1200).start(); // Fast
            setupLoop(wave2Anim, 1600).start(); // Medium
            setupLoop(wave3Anim, 2200).start(); // Slow

            // Punchy Vertical Beat
            Animated.loop(
                Animated.sequence([
                    Animated.timing(beatAnim, {
                        toValue: 1,
                        duration: 400 + Math.random() * 200, // Faster hits
                        easing: Easing.out(Easing.quad), // Punchy attack
                        useNativeDriver: true,
                    }),
                    Animated.timing(beatAnim, {
                        toValue: 0,
                        duration: 400 + Math.random() * 200,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            wave1Anim.stopAnimation();
            wave2Anim.stopAnimation();
            wave3Anim.stopAnimation();
            beatAnim.stopAnimation();

            // Reset beat
            Animated.spring(beatAnim, {
                toValue: 0.1,
                useNativeDriver: true,
            }).start();
        }
    }, [isPlaying]);

    return (
        <View className="flex-1 items-center justify-center w-full" style={{ height: 160 }}>
            {/* 
                Layered Waves with:
                - Different Anim Drivers (Speed)
                - Different Colors
                - Different Phase Offsets within the path generation
                - Complex Path (Harmonics) 
            */}
            <ComplexWave
                trackAnim={wave3Anim}
                beatAnim={beatAnim}
                color="#A78BFA" // Purple (Back)
                opacity={0.4}
                harmonics={[1, 0.5]} // Smoother
                verticalShift={10}
            />
            <ComplexWave
                trackAnim={wave2Anim}
                beatAnim={beatAnim}
                color="#34D399" // Green (Middle)
                opacity={0.6}
                harmonics={[0.8, 0.6]} // Jagged
                verticalShift={-5}
            />
            <ComplexWave
                trackAnim={wave1Anim}
                beatAnim={beatAnim}
                color="#4F5BD5" // Blue (Front)
                opacity={1} // Solid
                harmonics={[1.2, 0.3]} // Primary
                verticalShift={0}
            />
        </View>
    );
};

const ComplexWave = ({ trackAnim, beatAnim, color, opacity, harmonics, verticalShift }: any) => {
    const width = SCREEN_WIDTH;
    const height = 160;

    // Generate a seamless looping path with harmonics
    const generatePath = () => {
        let path = `M 0 ${height / 2} `;
        const points = 80; // Higher resolution for smoothness
        // We render 2 full screen widths so we can scroll loop
        const totalRenderWidth = width * 2;
        const segmentWidth = totalRenderWidth / points;

        for (let i = 0; i <= points; i++) {
            const x = i * segmentWidth;
            // Normalized X (0 to 2PI * 2 cycles)
            const nx = (x / width) * Math.PI * 2;

            // Complex Wave Function: sin(x) + A*sin(2x) ...
            // We ensure it loops at 'width' by making sure harmonics are integers relative to the base width
            const yOffset =
                Math.sin(nx * 1) * 20 * harmonics[0] +
                Math.sin(nx * 2) * 10 * harmonics[1]; // 2nd Harmonic adds "liquid" detail

            const y = height / 2 + yOffset + verticalShift;
            path += `L ${x} ${y} `;
        }
        return path;
    };

    // Check if useMemo is needed? For now static generation is fine as props rarely change in a way that needs regen
    // But let's wrap in useMemo if we were refactoring fully. Here simple const is fine as component re-renders are driven by parents.
    // Actually this runs on every render, which is wasteful if props change. But here props are static constants.
    const d = generatePath();

    const translateX = trackAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -width] // Move exactly one screen width (one fundamental wavelength)
    });

    const scaleY = beatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1.0, 1.6] // Big dynamic range like a voice waveform
    });

    return (
        <View style={{ position: 'absolute', width: width, height: height, overflow: 'hidden' }}>
            <Animated.View style={{
                transform: [{ translateX }, { scaleY }],
                width: width * 2,
                height: height,
                position: 'absolute',
                left: 0,
            }}>
                <Svg width={width * 2} height={height}>
                    <Path
                        d={d}
                        stroke={color}
                        strokeWidth={4} // Thicker lines for visibility
                        fill="none"
                        opacity={opacity}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Animated.View>
        </View>
    );
};
