/**
 * Audio Playback slice - Manages playback position persistence
 */

import type { StateCreator } from 'zustand';
import type { AudioPositionMap, AudioPlaybackPosition } from '../types';

const MAX_STORED_POSITIONS = 50;
const MAX_AGE_DAYS = 30;
const COMPLETION_THRESHOLD = 95; // percent

export interface AudioPlaybackSlice {
  playbackPositions: AudioPositionMap;

  // Core operations
  savePosition: (
    audioOverviewId: string,
    position: number,
    duration: number,
    notebookId: string,
    audioUrl: string
  ) => void;
  getPosition: (audioOverviewId: string) => number | null;
  clearPosition: (audioOverviewId: string) => void;

  // Cleanup operations
  cleanupOldPositions: (maxAgeInDays?: number) => void;
  cleanupCompletedPositions: () => void;

  // Utility
  hasStoredPosition: (audioOverviewId: string) => boolean;
  getResumeInfo: (audioOverviewId: string) => { position: number; percentComplete: number } | null;
}

export const createAudioPlaybackSlice: StateCreator<AudioPlaybackSlice> = (set, get) => ({
  playbackPositions: {},

  savePosition: (audioOverviewId, position, duration, notebookId, audioUrl) => {
    // Validate inputs
    if (position < 0 || duration <= 0) return;
    if (position > duration) position = duration;

    const percentComplete = (position / duration) * 100;

    // Don't save if audio is nearly complete (will be auto-cleaned)
    if (percentComplete >= COMPLETION_THRESHOLD) {
      get().clearPosition(audioOverviewId);
      return;
    }

    const newPosition: AudioPlaybackPosition = {
      audioOverviewId,
      notebookId,
      position,
      duration,
      audioUrl,
      lastPlayed: new Date().toISOString(),
      percentComplete,
    };

    set((state) => {
      const updatedPositions = {
        ...state.playbackPositions,
        [audioOverviewId]: newPosition,
      };

      // Enforce max stored positions limit
      const positionEntries = Object.entries(updatedPositions);
      if (positionEntries.length > MAX_STORED_POSITIONS) {
        // Sort by lastPlayed (oldest first) and remove oldest
        const sortedEntries = positionEntries.sort((a, b) =>
          new Date(a[1].lastPlayed).getTime() - new Date(b[1].lastPlayed).getTime()
        );

        // Keep only the most recent MAX_STORED_POSITIONS
        const trimmedEntries = sortedEntries.slice(-MAX_STORED_POSITIONS);
        return {
          playbackPositions: Object.fromEntries(trimmedEntries),
        };
      }

      return { playbackPositions: updatedPositions };
    });
  },

  getPosition: (audioOverviewId) => {
    const stored = get().playbackPositions[audioOverviewId];
    if (!stored) return null;

    // Validate stored position
    if (stored.position < 0 || stored.position > stored.duration) {
      return null;
    }

    return stored.position;
  },

  clearPosition: (audioOverviewId) => {
    set((state) => {
      const { [audioOverviewId]: _, ...rest } = state.playbackPositions;
      return { playbackPositions: rest };
    });
  },

  cleanupOldPositions: (maxAgeInDays = MAX_AGE_DAYS) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

    set((state) => {
      const filteredPositions = Object.fromEntries(
        Object.entries(state.playbackPositions).filter(([_, pos]) =>
          new Date(pos.lastPlayed) > cutoffDate
        )
      );

      return { playbackPositions: filteredPositions };
    });
  },

  cleanupCompletedPositions: () => {
    set((state) => {
      const filteredPositions = Object.fromEntries(
        Object.entries(state.playbackPositions).filter(([_, pos]) =>
          pos.percentComplete < COMPLETION_THRESHOLD
        )
      );

      return { playbackPositions: filteredPositions };
    });
  },

  hasStoredPosition: (audioOverviewId) => {
    return audioOverviewId in get().playbackPositions;
  },

  getResumeInfo: (audioOverviewId) => {
    const stored = get().playbackPositions[audioOverviewId];
    if (!stored) return null;

    return {
      position: stored.position,
      percentComplete: stored.percentComplete,
    };
  },
});
