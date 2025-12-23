import { useState, useEffect } from 'react';

/**
 * Cycles through an array of strings at a set interval.
 * Returns the current string.
 */
export const useDynamicMessage = (messages: string | readonly string[] | string[], intervalMs: number = 2500): string => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!messages || messages.length <= 1) return;

        const interval = setInterval(() => {
            setIndex((prevIndex) => (prevIndex + 1) % messages.length);
        }, intervalMs);

        return () => clearInterval(interval);
    }, [messages, intervalMs]);

    // Handle single string case or empty array
    if (typeof messages === 'string') return messages;
    if (!messages || messages.length === 0) return '';

    return messages[index];
};
