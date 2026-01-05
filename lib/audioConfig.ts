import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

let isConfigured = false;
let initPromise: Promise<void> | null = null;

/**
 * Configures the global audio mode for the app.
 * Ensures that app sounds mix with background music rather than stopping it.
 * 
 * @param staysActiveInBackground - Whether audio should continue when app is in background (e.g. for Podcast)
 */
export async function configureAudioMode(staysActiveInBackground: boolean = false) {
    try {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground,
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
