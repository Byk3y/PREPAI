/**
 * Audio Transcription Configuration
 * Configuration for audio-to-text services (Gemini)
 */

import { getRequiredEnv } from '../../env.ts';

/**
 * Configuration for audio transcription services
 */
export const AUDIO_CONFIG = {
  gemini: {
    enabled: true,
    apiKeyEnvVar: 'GOOGLE_AI_API_KEY',
    model: 'gemini-2.0-flash',
    temperature: 0.1,
    maxOutputTokens: 20480, // Allow for long recordings
    systemPrompt:
      'You are an expert academic transcriptionist. Provide a precise and cleanly formatted transcription of this audio. Break it into logical paragraphs. Include speaker labels (Speaker A, Speaker B, etc.) if there are multiple people. Return only the transcript text without any commentary.',
  },
} as const;

/**
 * Get API key for Gemini Audio Transcription
 */
export function getGeminiAudioApiKey(): string {
  return getRequiredEnv(AUDIO_CONFIG.gemini.apiKeyEnvVar);
}
