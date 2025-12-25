/**
 * YouTube Transcript Extraction Utility
 * Fetches transcript from YouTube videos using RapidAPI (Supadata) and cleans them using AI
 */

/**
 * Extract video ID from any YouTube URL
 */
export function extractYoutubeId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

/**
 * Fetch raw transcript from YouTube using RapidAPI (Supadata)
 */
export async function getYoutubeTranscript(url: string, rapidApiKey: string): Promise<string> {
    const videoId = extractYoutubeId(url);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    // Clean URL: Strip tracking params (si=...) to prevent API confusion
    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        console.log(`[youtube] Fetching transcript via RapidAPI for video: ${videoId}`);

        // Added &text=true to request plain text response from Supadata
        const response = await fetch(
            `https://youtube-transcripts.p.rapidapi.com/youtube/transcript?url=${encodeURIComponent(cleanUrl)}&videoId=${videoId}&text=true`,
            {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': rapidApiKey,
                    'x-rapidapi-host': 'youtube-transcripts.p.rapidapi.com'
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`RapidAPI Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        // Log keys but not full content for privacy/safety
        console.log(`[youtube] API Response keys: ${Object.keys(data).join(', ')}`);

        let transcriptOutput = '';

        if (data.transcript && typeof data.transcript === 'string') {
            transcriptOutput = data.transcript;
        } else if (Array.isArray(data.content)) {
            transcriptOutput = data.content.map((item: any) => item.text).join(' ');
        } else if (Array.isArray(data)) {
            transcriptOutput = data.map((item: any) => item.text).join(' ');
        } else if (data.content && typeof data.content === 'string') {
            transcriptOutput = data.content;
        }

        if (!transcriptOutput || transcriptOutput.trim().length === 0) {
            throw new Error('No transcript content found in API response');
        }

        // GUARD: Detect "Scrambled/Garbled" Dummy Data
        // Some APIs return "nonsense" text if the account is blocked or limited
        const scrambledCheck = transcriptOutput.substring(0, 50).toLowerCase();
        if (scrambledCheck.includes('foreangsble') || scrambledCheck.includes('rablaned')) {
            console.error('[youtube] Detected scrambled/dummy data from RapidAPI');
            throw new Error('The YouTube transcript was returned in a scrambled/protected format. Please try again in 5 minutes.');
        }

        return transcriptOutput;
    } catch (error: any) {
        console.error('[youtube] RapidAPI Error:', error.message);
        throw new Error(`Professional YouTube extraction failed: ${error.message}`);
    }
}

/**
 * Clean up the raw transcript using Gemini 2.0 Flash
 * Adds punctuation, corrects technical terms, and formats into paragraphs
 */
export async function cleanTranscriptWithAI(
    rawTranscript: string,
    apiKey: string
): Promise<string> {
    console.log('[youtube] Cleaning transcript with Gemini 2.0 Flash...');

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `You are an expert academic editor. Below is a raw, unpunctuated YouTube transcript. 
                  Your task is to:
                  1. Add proper punctuation and capitalization.
                  2. Break the text into logical, readable paragraphs.
                  3. Correct any obvious misspellings of technical, scientific, or academic terms.
                  4. Remove any "filler" words (uhm, ah, like) if many are present.
                  5. Maintain the exact original meaning and tone.
                  6. Return ONLY the cleaned text. No conversational filler or explanations.

                  RAW TRANSCRIPT:
                  ${rawTranscript.substring(0, 30000)}
                  `
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 20480,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini Transcript Cleaning error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const cleanedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!cleanedText || cleanedText.trim() === '') {
            throw new Error('Gemini returned an empty cleaned transcript');
        }

        return cleanedText.trim();
    } catch (error: any) {
        console.error('[youtube] AI Cleaning failed, falling back to raw:', error.message);
        return rawTranscript;
    }
}
