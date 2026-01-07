import { useCallback, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Audio, type AVPlaybackStatusSuccess } from 'expo-av';
import { useStore } from '@/lib/store';

type SoundName =
  | 'tap'
  | 'correct'
  | 'incorrect'
  | 'hint'
  | 'complete'
  | 'flip'
  | 'reveal'
  | 'start';

type HapticKind = 'selection' | 'light' | 'medium' | 'success' | 'error' | 'warning';

interface FeedbackOptions {
  allowSound?: boolean;
  allowHaptics?: boolean;
  playInSilentMode?: boolean;
  volume?: number; // 0.0 - 1.0
}

const SOUND_MAP: Record<SoundName, number> = {
  tap: require('../assets/sfx/tap.m4a'),
  correct: require('../assets/sfx/correct.m4a'),
  incorrect: require('../assets/sfx/incorrect.m4a'),
  hint: require('../assets/sfx/hint.m4a'),
  complete: require('../assets/sfx/complete.m4a'),
  flip: require('../assets/sfx/flip.m4a'),
  reveal: require('../assets/sfx/reveal.m4a'),
  start: require('../assets/sfx/start.m4a'),
};

const DEFAULT_VOLUME = 0.5;
const MIN_GAP_MS = 120; // throttle rapid plays per sound
const OUTCOME_SOUNDS = new Set<SoundName>(['correct', 'incorrect', 'complete']); // exempt from throttle

// GLOBAL SINGLETON CACHE
// This prevents overwhelming the audio system when multiple components use useFeedback
const globalSounds: Partial<Record<SoundName, Audio.Sound>> = {};
const globalLoading: Partial<Record<SoundName, Promise<Audio.Sound | undefined>>> = {};
let globalVolume = DEFAULT_VOLUME;

/**
 * Preloads a specific sound into the global cache
 */
async function loadSoundGlobal(name: SoundName): Promise<Audio.Sound | undefined> {
  if (globalSounds[name]) return globalSounds[name];
  if (globalLoading[name]) return globalLoading[name];

  const loadPromise = (async () => {
    try {
      const { waitForAudioInit } = await import('@/lib/audioConfig');
      await waitForAudioInit();

      const { sound } = await Audio.Sound.createAsync(SOUND_MAP[name], {
        volume: globalVolume,
        shouldPlay: false,
      });
      globalSounds[name] = sound;
      return sound;
    } catch (e) {
      console.log('[feedback] failed to load sound', name, e);
      return undefined;
    } finally {
      globalLoading[name] = undefined;
    }
  })();

  globalLoading[name] = loadPromise;
  return loadPromise;
}

/**
 * Preloads all sounds into the global cache
 */
export async function preloadAllSounds() {
  const names = Object.keys(SOUND_MAP) as SoundName[];
  await Promise.all(names.map(name => loadSoundGlobal(name)));
}

export function useFeedback(options: FeedbackOptions = {}) {
  const {
    allowSound = true,
    allowHaptics = true,
    volume = DEFAULT_VOLUME,
  } = options;

  // Update global volume if changed
  useEffect(() => {
    globalVolume = volume;
  }, [volume]);

  // Initial preload trigger (one-time global)
  useEffect(() => {
    preloadAllSounds().catch(() => { });
  }, []);

  const lastPlayRef = useRef<Partial<Record<SoundName, number>>>({});

  const play = useCallback(
    async (name: SoundName, opts?: { volume?: number }) => {
      const { audioSettings } = useStore.getState();
      if (!audioSettings.soundEffectsEnabled || !allowSound) return;

      // Throttle check
      const now = Date.now();
      const last = lastPlayRef.current[name] ?? 0;
      if (!OUTCOME_SOUNDS.has(name) && now - last < MIN_GAP_MS) return;
      lastPlayRef.current[name] = now;

      let sound = globalSounds[name];
      if (!sound) {
        sound = await loadSoundGlobal(name);
      }
      if (!sound) return;

      try {
        const status = (await sound.getStatusAsync()) as AVPlaybackStatusSuccess;
        if (!status.isLoaded) return;

        // Apply specific volume or default
        const targetVolume = opts?.volume ?? volume;
        if (status.volume !== targetVolume) {
          await sound.setVolumeAsync(targetVolume);
        }

        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch (error) {
        if (__DEV__) console.log(`[feedback] play failed for ${name}:`, error);
      }
    },
    [allowSound, volume]
  );

  const haptic = useCallback(
    (kind: HapticKind) => {
      const { audioSettings } = useStore.getState();
      if (!audioSettings.hapticsEnabled || !allowHaptics) return;

      switch (kind) {
        case 'selection':
          Haptics.selectionAsync();
          break;
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        default:
          break;
      }
    },
    [allowHaptics]
  );

  return { play, haptic, preload: preloadAllSounds };
}
