import React, { useState, useEffect, useRef } from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

interface TypewriterTextProps {
    text: string;
    style?: TextStyle | TextStyle[];
    speed?: number;
    delay?: number;
    onComplete?: () => void;
    hapticEnabled?: boolean;
    hapticStyle?: Haptics.ImpactFeedbackStyle;
    startTrigger?: boolean;
}

/**
 * A premium typewriter component that syncs with Haptic feedback
 */
export function TypewriterText({
    text,
    style,
    speed = 40,
    delay = 0,
    onComplete,
    hapticEnabled = true,
    hapticStyle = Haptics.ImpactFeedbackStyle.Light,
    startTrigger = true,
}: TypewriterTextProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [isStarted, setIsStarted] = useState(false);
    const index = useRef(0);
    const timer = useRef<NodeJS.Timeout | null>(null);

    const hasCalledComplete = useRef(false);

    useEffect(() => {
        if (startTrigger && !isStarted) {
            const startTimeout = setTimeout(() => {
                setIsStarted(true);
            }, delay);
            return () => clearTimeout(startTimeout);
        }
    }, [startTrigger, delay, isStarted]);

    useEffect(() => {
        if (!isStarted) return;

        if (index.current < text.length) {
            timer.current = setTimeout(() => {
                const nextChar = text[index.current];
                setDisplayedText((prev) => prev + nextChar);

                // Trigger haptic if enabled
                // Only trigger on actual characters, not just whitespace to feel more "clickable"
                if (hapticEnabled && nextChar !== ' ') {
                    Haptics.impactAsync(hapticStyle);
                }

                index.current += 1;
            }, speed);
        } else if (onComplete && !hasCalledComplete.current) {
            hasCalledComplete.current = true;
            onComplete();
        }

        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [displayedText, isStarted, text, speed, hapticEnabled, hapticStyle, onComplete]);

    return (
        <Text style={style}>
            {displayedText}
            {/* Invisible placeholder of full text to maintain layout size and prevent jumping */}
            <Text style={{ opacity: 0 }}>{text.slice(index.current)}</Text>
        </Text>
    );
}

const styles = StyleSheet.create({});
