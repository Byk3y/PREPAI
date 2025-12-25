import { useCallback, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Audio, type AVPlaybackStatusSuccess, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

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
  tap: require('../assets/sfx/tap.wav'),
  correct: require('../assets/sfx/correct.wav'),
  incorrect: require('../assets/sfx/incorrect.wav'),
  hint: require('../assets/sfx/hint.wav'),
  complete: require('../assets/sfx/complete.wav'),
  flip: require('../assets/sfx/flip.wav'),
  reveal: require('../assets/sfx/reveal.wav'),
  start: require('../assets/sfx/start.wav'),
};

const DEFAULT_VOLUME = 0.5;
const MIN_GAP_MS = 120; // throttle rapid plays per sound
const OUTCOME_SOUNDS = new Set<SoundName>(['correct', 'incorrect', 'complete']); // exempt from throttle

export function useFeedback(options: FeedbackOptions = {}) {
  const {
    allowSound = true,
    allowHaptics = true,
    playInSilentMode = true,
    volume = DEFAULT_VOLUME,
  } = options;

  const soundsRef = useRef<Partial<Record<SoundName, Audio.Sound>>>({});
  const lastPlayRef = useRef<Partial<Record<SoundName, number>>>({});
  const loadingRef = useRef<Partial<Record<SoundName, Promise<Audio.Sound | undefined>>>>({});

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Audio mode is now initialized globally in _layout.tsx
        // but we ensure it's set correctly here just in case, 
        // using the same parameters to avoid session interruptions.
        // We only preload sounds here.

        // Preload optimistically
        for (const name of Object.keys(SOUND_MAP) as SoundName[]) {
          const { sound } = await Audio.Sound.createAsync(SOUND_MAP[name], {
            volume,
            shouldPlay: false,
          });
          if (!mounted) {
            await sound.unloadAsync();
            return;
          }
          soundsRef.current[name] = sound;
        }
      } catch (e) {
        // Soft fail; we don't want to block UI if audio init fails
        console.log('[feedback] init failed', e);
      }
    })();

    return () => {
      mounted = false;
      const sounds = soundsRef.current;
      soundsRef.current = {};
      Object.values(sounds).forEach((sound) => {
        sound?.unloadAsync().catch(() => undefined);
      });
    };
  }, [playInSilentMode, volume]);

  const ensureLoaded = useCallback(async (name: SoundName): Promise<Audio.Sound | undefined> => {
    if (soundsRef.current[name]) return soundsRef.current[name];
    if (loadingRef.current[name]) return loadingRef.current[name];

    const loadPromise = (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(SOUND_MAP[name], {
          volume,
          shouldPlay: false,
        });
        soundsRef.current[name] = sound;
        return sound;
      } catch (e) {
        console.log('[feedback] failed to load sound', name, e);
        return undefined;
      } finally {
        loadingRef.current[name] = undefined;
      }
    })();

    loadingRef.current[name] = loadPromise;
    return loadPromise;
  }, [volume]);

  const play = useCallback(
    async (name: SoundName, opts?: { volume?: number }) => {
      if (!allowSound) return;

      // Throttle check - exempt outcome sounds (correct/incorrect/complete)
      const now = Date.now();
      const last = lastPlayRef.current[name] ?? 0;
      if (!OUTCOME_SOUNDS.has(name) && now - last < MIN_GAP_MS) return;
      lastPlayRef.current[name] = now;

      let sound = soundsRef.current[name];
      if (!sound) {
        sound = await ensureLoaded(name);
      }
      if (!sound) return;

      const status = (await sound.getStatusAsync()) as AVPlaybackStatusSuccess;
      if (!status.isLoaded) return;

      if (typeof opts?.volume === 'number' && status.volume !== opts.volume) {
        await sound.setVolumeAsync(opts.volume);
      }

      await sound.setPositionAsync(0);
      await sound.playAsync();
    },
    [allowSound, ensureLoaded]
  );

  const haptic = useCallback(
    (kind: HapticKind) => {
      if (!allowHaptics) return;

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

  const preload = useCallback(
    async (names?: SoundName[]) => {
      const targets = names ?? (Object.keys(SOUND_MAP) as SoundName[]);
      await Promise.all(targets.map((n) => ensureLoaded(n)));
    },
    [ensureLoaded]
  );

  return { play, haptic, preload };
}














