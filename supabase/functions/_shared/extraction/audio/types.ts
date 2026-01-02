/**
 * Audio Transcription Module Types
 * Types for audio-to-text conversion
 */

/**
 * Audio transcription result
 * (Currently returns simple string, but this interface is prepared for future metadata)
 */
export interface TranscriptionResult {
  text: string;
  metadata: {
    processingTime: number;
    audioUrl: string;
    detectedMimeType: string;
  };
}
