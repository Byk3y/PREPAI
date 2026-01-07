/**
 * Audio Settings Slice - Manages user preferences for sound and voice
 */

import type { StateCreator } from 'zustand';

export interface AudioSettingsState {
    soundEffectsEnabled: boolean;
    hapticsEnabled: boolean;
    voiceVolume: number;
    backgroundPlayback: boolean;
}

export interface AudioSettingsSlice {
    audioSettings: AudioSettingsState;

    // Actions
    setSoundEffectsEnabled: (enabled: boolean) => void;
    setHapticsEnabled: (enabled: boolean) => void;
    setVoiceVolume: (volume: number) => void;
    setBackgroundPlayback: (enabled: boolean) => void;
    updateAudioSettings: (settings: Partial<AudioSettingsState>) => void;
}

const DEFAULT_SETTINGS: AudioSettingsState = {
    soundEffectsEnabled: true,
    hapticsEnabled: true,
    voiceVolume: 0.8,
    backgroundPlayback: true,
};

export const createAudioSettingsSlice: StateCreator<AudioSettingsSlice> = (set) => ({
    audioSettings: DEFAULT_SETTINGS,

    setSoundEffectsEnabled: (enabled) =>
        set((state) => ({
            audioSettings: { ...state.audioSettings, soundEffectsEnabled: enabled }
        })),

    setHapticsEnabled: (enabled) =>
        set((state) => ({
            audioSettings: { ...state.audioSettings, hapticsEnabled: enabled }
        })),

    setVoiceVolume: (volume) =>
        set((state) => ({
            audioSettings: { ...state.audioSettings, voiceVolume: volume }
        })),

    setBackgroundPlayback: (enabled) =>
        set((state) => ({
            audioSettings: { ...state.audioSettings, backgroundPlayback: enabled }
        })),

    updateAudioSettings: (settings) =>
        set((state) => ({
            audioSettings: { ...state.audioSettings, ...settings }
        })),
});
