/**
 * ProgressDots Component
 * Shows progress through a series of steps
 */

import React from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import { styles } from '../styles';

interface ProgressDotsProps {
    total: number;
    current: number;
    activeColor: string;
    inactiveColor: string;
}

export function ProgressDots({ total, current, activeColor, inactiveColor }: ProgressDotsProps) {
    return (
        <View style={styles.progressDots}>
            {Array.from({ length: total }).map((_, idx) => (
                <MotiView
                    key={idx}
                    animate={{
                        backgroundColor: idx <= current ? activeColor : inactiveColor,
                        scale: idx === current ? 1.2 : 1,
                    }}
                    style={styles.progressDot}
                />
            ))}
        </View>
    );
}
