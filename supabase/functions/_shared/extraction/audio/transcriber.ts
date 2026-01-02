/**
 * Audio Transcription Service
 * Transcribe audio to text using Gemini 2.0 Flash
 */

import { bufferToBase64, detectAudioMimeTypeFromUrl } from '../common/utils.ts';
import { AUDIO_CONFIG, getGeminiAudioApiKey } from './config.ts';

/**
 * Transcribe audio to text using Gemini 2.0 Flash (Multimodal AI)
 * Faster, cheaper, and more accurate than AssemblyAI for study materials
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const apiKey = getGeminiAudioApiKey();

  console.log('[transcribeAudio] START - Fetching audio from:', audioUrl);
  const startTime = Date.now();

  try {
    // Step 1: Fetch audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
    }
    const audioBuffer = new Uint8Array(await audioResponse.arrayBuffer());
    console.log('[transcribeAudio] Downloaded buffer size:', audioBuffer.length);

    // SECURITY: Validate file magic bytes to ensure it's actually audio
    const { validateFileMagicBytes } = await import('../../validation.ts');
    const fileValidation = validateFileMagicBytes(audioBuffer, 'audio');
    if (!fileValidation.isValid) {
      console.error(
        '[transcribeAudio] SECURITY: File magic byte validation failed:',
        fileValidation.error
      );
      throw new Error(fileValidation.error || 'Invalid audio file');
    }
    console.log(
      '[transcribeAudio] File magic bytes validated - confirmed audio:',
      fileValidation.detectedType
    );

    // Step 2: Convert to base64 using shared utility
    const base64Audio = bufferToBase64(audioBuffer);

    // Step 3: Detect MIME type from URL extension
    const mimeType = detectAudioMimeTypeFromUrl(audioUrl);

    // Step 4: Call Gemini 2.0 Flash API (multimodal)
    console.log('[transcribeAudio] Requesting transcription from Gemini...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AUDIO_CONFIG.gemini.model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Audio,
                  },
                },
                {
                  text: AUDIO_CONFIG.gemini.systemPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: AUDIO_CONFIG.gemini.temperature,
            maxOutputTokens: AUDIO_CONFIG.gemini.maxOutputTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Audio API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text || text.trim() === '') {
      throw new Error('Gemini returned an empty transcription');
    }

    const duration = Date.now() - startTime;
    console.log(`[transcribeAudio] SUCCESS: Transcribed in ${duration}ms`);

    return text.trim();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[transcribeAudio] ERROR:', message);
    throw new Error(`Audio transcription error: ${message}`);
  }
}
