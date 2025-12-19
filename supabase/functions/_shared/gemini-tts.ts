/**
 * Gemini 2.5 Flash TTS Integration
 * Generates NotebookLM-style podcast audio with two speakers (Alex & Morgan)
 * Uses the same technology that powers NotebookLM Audio Overviews
 */

import { getRequiredEnv } from './env.ts';

const GEMINI_TTS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';

export interface GeminiTTSConfig {
  script: string; // Dialogue with speaker labels (Alex: ..., Morgan: ...)
  stylePrompt?: string; // Optional: Override default personality prompts
  speakerMap?: Record<string, string>; // Optional: Map speaker names to voice names (e.g. { "Rex": "Puck" })
}

export interface GeminiTTSResponse {
  audioBytes: Uint8Array; // Audio data (format depends on mimeType)
  durationSeconds: number; // Audio duration
  audioTokens: number; // Tokens used (32 tokens/second)
  mimeType: string; // Audio MIME type (e.g., 'audio/wav', 'audio/mpeg')
}

/**
 * Create a WAV file from raw PCM audio data
 * WAV format: RIFF header + fmt chunk + data chunk
 */
function createWavFile(
  pcmData: Uint8Array,
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number
): Uint8Array {
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true); // File size minus RIFF header
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Chunk size (16 for PCM)
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Copy PCM data
  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmData, headerSize);

  return wavBytes;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Parse sample rate from WAV file header
 * WAV format: sample rate is stored at bytes 24-27 (little-endian uint32)
 * @param wavBytes - WAV file bytes
 * @returns Sample rate in Hz, or null if invalid WAV file
 */
function parseWavSampleRate(wavBytes: Uint8Array): number | null {
  try {
    // Check minimum size (need at least 44 bytes for header)
    if (wavBytes.length < 44) {
      return null;
    }

    // Check for RIFF header
    const riff = String.fromCharCode(
      wavBytes[0], wavBytes[1], wavBytes[2], wavBytes[3]
    );
    if (riff !== 'RIFF') {
      return null;
    }

    // Check for WAVE format
    const wave = String.fromCharCode(
      wavBytes[8], wavBytes[9], wavBytes[10], wavBytes[11]
    );
    if (wave !== 'WAVE') {
      return null;
    }

    // Read sample rate from bytes 24-27 (little-endian uint32)
    const view = new DataView(wavBytes.buffer, wavBytes.byteOffset, wavBytes.byteLength);
    const sampleRate = view.getUint32(24, true); // true = little-endian

    // Validate sample rate is reasonable (between 8000 and 192000 Hz)
    if (sampleRate < 8000 || sampleRate > 192000) {
      console.warn(`[Gemini TTS] Invalid sample rate in WAV header: ${sampleRate}Hz, using fallback`);
      return null;
    }

    return sampleRate;
  } catch (error) {
    console.error('[Gemini TTS] Error parsing WAV header:', error);
    return null;
  }
}

/**
 * Default style prompt for Alex & Morgan podcast hosts
 */
const DEFAULT_STYLE_PROMPT = `Generate a conversational podcast between two hosts discussing study material:

ALEX (Speaker 1): A friendly, enthusiastic female voice in her late 20s. She speaks with curiosity and excitement when learning new things. Her tone is conversational and relatable, with a slightly faster pace that conveys energy and engagement. She asks clarifying questions and relates concepts to real-world examples.

MORGAN (Speaker 2): A warm, professional male voice in his mid-30s. He speaks with clarity and confidence, using a measured pace that helps complex ideas land. His tone is encouraging and patient, like a mentor explaining concepts to a curious student.

STYLE: Natural, conversational podcast format with back-and-forth dialogue. Include natural pauses, thoughtful moments, and expressions of discovery ("Oh, that's interesting!", "Wait, so..."). Avoid sounding scripted or robotic.`;

/**
 * Generate podcast-style audio using Gemini 2.5 Flash TTS
 * Supports multi-speaker dialogue natively (no concatenation needed!)
 */
export async function generatePodcastAudio(
  config: GeminiTTSConfig
): Promise<GeminiTTSResponse> {
  const GEMINI_API_KEY = getRequiredEnv('GOOGLE_AI_API_KEY');

  console.log('[Gemini TTS] Generating podcast audio...');

  // Limit script length to prevent memory issues (max ~2000 words = ~12k chars)
  const maxScriptLength = 12000;
  let script = config.script;
  if (script.length > maxScriptLength) {
    console.warn(`[Gemini TTS] Script too long (${script.length} chars), truncating to ${maxScriptLength}`);
    // Truncate at a sentence boundary if possible
    script = script.substring(0, maxScriptLength);
    const lastPeriod = script.lastIndexOf('.');
    if (lastPeriod > maxScriptLength * 0.8) {
      script = script.substring(0, lastPeriod + 1);
    }
  }

  console.log(`[Gemini TTS] Script length: ${script.length} characters`);

  // Extract UNIQUE speakers from script tags (e.g. "Alex:", "Morgan:")
  const speakerRegex = /^([A-Z][a-zA-Z\s]+):/gm;
  const speakers = new Set<string>();
  let match;
  while ((match = speakerRegex.exec(script)) !== null) {
    speakers.add(match[1]);
  }
  const speakerList = Array.from(speakers);
  console.log('[Gemini TTS] Detected speakers:', speakerList);

  // Build speaker configs
  const speakerVoiceConfigs = speakerList.map(speakerName => {
    // Determine voice name from mapping or defaults
    // If no map, default to legacy Alex=Kore, Morgan=Puck
    let voiceName = 'Kore'; // Default fallback

    if (config.speakerMap && config.speakerMap[speakerName]) {
      voiceName = config.speakerMap[speakerName];
    } else {
      // Legacy fallback
      if (speakerName.startsWith('Morgan')) voiceName = 'Puck';
      else voiceName = 'Kore';
    }

    return {
      speaker: speakerName,
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voiceName
        }
      }
    };
  });

  try {
    // Prepare request payload with multi-speaker configuration
    // The script should have format "Alex: ..." and "Morgan: ..."
    const payload = {
      contents: [
        {
          parts: [
            {
              text: script // Only the dialogue script, no style prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          // Multi-speaker voice configuration
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakerVoiceConfigs
          }
        }
      }
    };

    console.log('[Gemini TTS] Calling Gemini API...');
    const startTime = Date.now();

    const response = await fetch(`${GEMINI_TTS_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const latency = Date.now() - startTime;
    console.log(`[Gemini TTS] API response received (${latency}ms)`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini TTS] API error:', errorText);
      throw new Error(`Gemini TTS API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract audio data and MIME type from response
    // Gemini returns audio as base64-encoded data in the response
    const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const audioData = inlineData?.data;
    const mimeType = inlineData?.mimeType || 'audio/wav'; // Default to WAV

    console.log(`[Gemini TTS] Audio MIME type: ${mimeType}`);

    if (!audioData) {
      console.error('[Gemini TTS] No audio data in response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No audio data in Gemini TTS response');
    }

    // Decode base64 audio to bytes
    const binaryString = atob(audioData);
    let audioBytes: Uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      audioBytes[i] = binaryString.charCodeAt(i);
    }

    console.log(`[Gemini TTS] Raw audio: ${audioBytes.length} bytes`);

    // If audio is raw PCM (audio/L16), wrap it in a WAV container
    let finalMimeType = mimeType;
    let knownSampleRate: number | null = null;
    if (mimeType.includes('audio/L16') || mimeType.includes('pcm')) {
      console.log('[Gemini TTS] Converting raw PCM to WAV...');

      // Parse sample rate from MIME type (e.g., "audio/L16;codec=pcm;rate=24000")
      const rateMatch = mimeType.match(/rate=(\d+)/);
      knownSampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
      const numChannels = 1; // Mono
      const bitsPerSample = 16; // L16 = 16-bit

      audioBytes = createWavFile(audioBytes, knownSampleRate, numChannels, bitsPerSample);
      finalMimeType = 'audio/wav';

      console.log(`[Gemini TTS] WAV created: ${audioBytes.length} bytes (${knownSampleRate}Hz)`);
    }

    // Calculate actual duration from audio data
    // For WAV: duration = (fileSize - 44 header) / (sampleRate * channels * bytesPerSample)
    let durationSeconds: number;
    if (finalMimeType === 'audio/wav') {
      // Parse sample rate from WAV header (most reliable method)
      // If we just created the WAV from PCM, we already know the sample rate
      let sampleRate = knownSampleRate;
      
      if (sampleRate === null) {
        // Parse from WAV header
        const parsedRate = parseWavSampleRate(audioBytes);
        if (parsedRate !== null) {
          sampleRate = parsedRate;
          console.log(`[Gemini TTS] Parsed sample rate from WAV header: ${sampleRate}Hz`);
        } else {
          // Fallback: try MIME type, then default
          const rateMatch = mimeType.match(/rate=(\d+)/);
          sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
          console.warn(`[Gemini TTS] Could not parse WAV header, using fallback: ${sampleRate}Hz`);
        }
      }

      const dataSize = audioBytes.length - 44; // Subtract WAV header
      durationSeconds = dataSize / (sampleRate * 1 * 2); // mono, 16-bit
    } else {
      // Estimate duration for other formats
      const estimatedTokens = Math.ceil(script.length / 4);
      const audioTokens = Math.ceil(estimatedTokens * 0.75);
      durationSeconds = audioTokens / 32;
    }

    console.log(`[Gemini TTS] Duration: ${durationSeconds.toFixed(1)}s`);

    return {
      audioBytes,
      durationSeconds,
      audioTokens: Math.ceil(durationSeconds * 32),
      mimeType: finalMimeType,
    };

  } catch (error: any) {
    console.error('[Gemini TTS] Generation failed:', error);
    throw new Error(`Gemini TTS generation failed: ${error.message}`);
  }
}

/**
 * Retry wrapper for Gemini TTS with exponential backoff
 */
export async function generatePodcastAudioWithRetry(
  config: GeminiTTSConfig,
  maxRetries = 3
): Promise<GeminiTTSResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generatePodcastAudio(config);
    } catch (error: any) {
      lastError = error;
      console.error(`[Gemini TTS] Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on certain errors (auth, invalid request)
      if (
        error.message.includes('401') ||
        error.message.includes('403') ||
        error.message.includes('400') ||
        error.message.includes('INVALID')
      ) {
        throw error; // Fail fast on non-retryable errors
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Gemini TTS] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Gemini TTS failed after retries');
}

/**
 * Calculate audio duration from MP3 bytes (more accurate than token estimate)
 * This is a simplified implementation - for production, consider using a proper MP3 parser
 */
export function getAudioDuration(audioBytes: Uint8Array): number {
  // For now, return estimated duration based on file size
  // MP3 at 128kbps ≈ 16KB/second
  const durationSeconds = audioBytes.length / 16000;
  return Math.max(1, Math.round(durationSeconds * 10) / 10); // Round to 1 decimal
}
