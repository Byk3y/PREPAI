/**
 * MascotBubble Component
 * Displays the mascot with a speech bubble
 */

import React from 'react';
import { View, Image, Text, ImageSourcePropType } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Path } from 'react-native-svg';
import { styles } from '../styles';

interface MascotBubbleProps {
    mascotImage: ImageSourcePropType;
    bubbleText: string;
    colors: {
        text: string;
        surfaceElevated: string;
    };
    mascotAnimation?: object;
    bubbleDelay?: number;
    useSmallMascot?: boolean;
    bubbleTextStyle?: object;
}

export function MascotBubble({
    mascotImage,
    bubbleText,
    colors,
    mascotAnimation = { translateY: [-5, 5, -5] },
    bubbleDelay = 0,
    useSmallMascot = false,
    bubbleTextStyle,
}: MascotBubbleProps) {
    return (
        <>
            <View style={styles.mascotSection}>
                <MotiView
                    animate={mascotAnimation}
                    transition={{ loop: true, type: 'timing', duration: 3000 } as any}
                >
                    <Image
                        source={mascotImage}
                        style={useSmallMascot ? styles.mascotImageSmall : styles.mascotImage}
                        resizeMode="contain"
                    />
                </MotiView>
            </View>

            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: bubbleDelay } as any}
                style={[styles.speechBubble, { backgroundColor: colors.surfaceElevated }]}
            >
                <Text style={[styles.bubbleText, { color: colors.text }, bubbleTextStyle]}>
                    {bubbleText}
                </Text>
                <View style={styles.bubbleTail}>
                    <Svg width="20" height="12" viewBox="0 0 20 12">
                        <Path
                            d="M10 12C10 12 7.5 4 0 0L20 0C12.5 4 10 12 10 12Z"
                            fill={colors.surfaceElevated}
                        />
                    </Svg>
                </View>
            </MotiView>
        </>
    );
}
