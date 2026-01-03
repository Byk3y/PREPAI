/**
 * Script Parser - Parses podcast scripts into timed segments
 * Format: "Speaker: dialogue\n\nSpeaker: dialogue..."
 */

export interface ScriptSegment {
    speaker: string;
    text: string;
    charStart: number;
    charEnd: number;
}

/**
 * Parse a podcast script into segments
 * @param script - The full script text with speaker labels
 * @returns Array of parsed segments with character positions
 */
export function parseScript(script: string): ScriptSegment[] {
    if (!script || script.trim().length === 0) {
        return [];
    }

    const segments: ScriptSegment[] = [];

    // Split by double newlines (paragraph breaks between speakers)
    const parts = script.split(/\n\n+/);

    let charPosition = 0;

    for (const part of parts) {
        const trimmedPart = part.trim();
        if (!trimmedPart) {
            charPosition += part.length + 2; // Account for \n\n
            continue;
        }

        // Match speaker pattern: "Name:" at the start
        const speakerMatch = trimmedPart.match(/^([A-Za-z]+):\s*/);

        if (speakerMatch) {
            const speaker = speakerMatch[1];
            const text = trimmedPart.slice(speakerMatch[0].length).trim();

            segments.push({
                speaker,
                text,
                charStart: charPosition,
                charEnd: charPosition + trimmedPart.length,
            });
        } else {
            // No speaker label - append to previous segment or create anonymous
            if (segments.length > 0) {
                const lastSegment = segments[segments.length - 1];
                lastSegment.text += ' ' + trimmedPart;
                lastSegment.charEnd = charPosition + trimmedPart.length;
            }
        }

        charPosition += part.length + 2; // Account for \n\n separator
    }

    return segments;
}

/**
 * Get the current segment based on playback position
 * Uses linear interpolation based on character position
 * 
 * @param currentTime - Current playback time in seconds
 * @param duration - Total audio duration in seconds
 * @param segments - Parsed script segments
 * @param totalChars - Total character count of the script
 * @returns The current segment or null if not found
 */
export function getCurrentSegment(
    currentTime: number,
    duration: number,
    segments: ScriptSegment[],
    totalChars: number
): ScriptSegment | null {
    if (segments.length === 0 || duration === 0) {
        return null;
    }

    // Calculate estimated character position based on time progress
    const progress = Math.min(currentTime / duration, 1);
    const charPosition = progress * totalChars;

    // Find the segment that contains this character position
    for (const segment of segments) {
        if (charPosition >= segment.charStart && charPosition < segment.charEnd) {
            return segment;
        }
    }

    // If past all segments, return the last one
    if (charPosition >= totalChars && segments.length > 0) {
        return segments[segments.length - 1];
    }

    // Default to first segment at the start
    return segments[0] || null;
}

/**
 * Get speaker color based on speaker name
 * Uses consistent colors for known speakers
 */
export function getSpeakerColor(speaker: string, isDarkMode: boolean = false): string {
    const colors: Record<string, { light: string; dark: string }> = {
        'Brigo': { light: '#4F5BD5', dark: '#818CF8' },    // Purple/Indigo
        'Holian': { light: '#059669', dark: '#34D399' },   // Green
        'Alex': { light: '#4F5BD5', dark: '#818CF8' },     // Purple (alias)
        'Morgan': { light: '#059669', dark: '#34D399' },   // Green (alias)
    };

    const colorSet = colors[speaker] || { light: '#6B7280', dark: '#9CA3AF' };
    return isDarkMode ? colorSet.dark : colorSet.light;
}

/**
 * Get speaker initials for avatar
 */
export function getSpeakerInitials(speaker: string): string {
    return speaker.charAt(0).toUpperCase();
}
