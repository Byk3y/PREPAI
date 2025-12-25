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
 * Fetch raw transcript from YouTube using RapidAPI
 */
export async function getYoutubeTranscript(url: string, rapidApiKey: string): Promise<string> {
    const videoId = extractYoutubeId(url);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }

    try {
        console.log(`[youtube] Fetching transcript via RapidAPI for video: ${videoId}`);

        const response = await fetch(
            `https://youtube-transcripts.p.rapidapi.com/youtube/transcript?url=${encodeURIComponent(url)}&videoId=${videoId}`,
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

        // Supadata usually returns an array of segments or a full text
        // Adjusting based on standard RapidAPI transcript formats
        if (data.transcript && typeof data.transcript === 'string') {
            return data.transcript;
        } else if (Array.isArray(data.content)) {
            return data.content.map((item: any) => item.text).join(' ');
        } else if (Array.isArray(data)) {
            return data.map((item: any) => item.text).join(' ');
        }

        throw new Error('Unexpected transcript format from API');
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
