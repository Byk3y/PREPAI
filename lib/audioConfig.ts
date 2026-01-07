import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useStore } from './store';

// We'll keep using expo-av for the generic config for now as expo-audio is a 
// drop-in replacement but most existing code still expects the expo-av Sound objects.
// However, we will initialize it using user's saved preferences.

let isConfigured = false;
let initPromise: Promise<void> | null = null;
let currentSettings: any = null;

/**
 * Configures the global audio mode for the app.
 * Ensures that app sounds mix with background music rather than stopping it.
 */
export async function configureAudioMode(staysActiveInBackground: boolean = false) {
    try {
        const state = useStore.getState();
        const { audioSettings } = state;

        // Save current settings to compare later
        currentSettings = { ...audioSettings, staysActiveInBackground };

        // Brigo is a media-centric app (like Spotify/Duolingo). 
        // We always play through the main speaker and always allow background playback
        // even if the silent switch is ON, because hitting "Play" is an explicit user action.
        const shouldBackground = staysActiveInBackground || audioSettings.backgroundPlayback;

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true, // Always play despite silent switch
            staysActiveInBackground: shouldBackground,
            // Allow sound effects to mix with background music instead of interrupting it
            interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
            // On Android, DuckOthers allows our sounds to play alongside other audio
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            // On Android, shouldDuckAndroid allows coexistence
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });
        isConfigured = true;
    } catch (error) {
        console.error('[AudioConfig] Failed to set audio mode:', error);
    }
}

/**
 * Subscriber to store changes - re-applies audio mode if preferences change.
 */
useStore.subscribe((state) => {
    const settings = state.audioSettings;
    if (!isConfigured || !settings) return;

    // Only re-configure if relevant flags changed
    if (
        currentSettings?.backgroundPlayback !== settings.backgroundPlayback ||
        currentSettings?.hapticsEnabled !== settings.hapticsEnabled
    ) {
        console.log('[AudioConfig] Audio settings changed, re-configuring...');
        configureAudioMode(currentSettings?.staysActiveInBackground);
    }
});

/**
 * Initial configuration for the app startup.
 * Sets the default "mixing" mode.
 * Returns a promise that resolves when audio is configured.
 * Multiple calls return the same promise (singleton pattern).
 */
export function initAudioConfig(): Promise<void> {
    if (isConfigured) return Promise.resolve();
    if (initPromise) return initPromise;

    initPromise = configureAudioMode(false);
    return initPromise;
}

/**
 * Wait for audio to be initialized.
 * Use this in components that need to play sounds.
 */
export async function waitForAudioInit(): Promise<void> {
    if (isConfigured) return;
    if (initPromise) {
        await initPromise;
    } else {
        await initAudioConfig();
    }
}

/**
 * Check if audio has been configured.
 */
export function isAudioConfigured(): boolean {
    return isConfigured;
}
