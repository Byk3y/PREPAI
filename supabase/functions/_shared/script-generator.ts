/**
 * Podcast Script Generator using Gemini 2.5 Pro
 * Two-stage process:
 *   1. Extract key insights from material
 *   2. Generate Dialogue script (Pet & Teacher)
 */

const GEMINI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
// Use gemini-2.0-flash for faster and more reliable insight extraction
const GEMINI_FLASH_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface ScriptGenerationConfig {
  materialContent: string; // Full extracted text from material
  notebookTitle: string; // Title of the notebook
  targetDurationMinutes?: number; // Target audio duration (3-8 minutes)
  petName?: string; // Optional pet name (default: "Sparky")
}

export interface GeneratedScript {
  script: string; // Full dialogue with speaker labels
  keyInsights: string[]; // Key points extracted (for reference)
  wordCount: number;
  estimatedMinutes: number;
  llmTokens: number; // Total tokens used
  costCents: number; // Estimated cost
  speakerMap: Record<string, string>; // Map speaker names to voices (e.g. { "Rex": "Puck", "Morgana": "Kore" })
}

/**
 * Calculate target word count based on material length and duration constraints
 */
function calculateTargetWordCount(materialContent: string): number {
  const wordCount = materialContent.split(/\s+/).length;

  // Formula: min(5, max(2, word_count / 1500)) minutes
  // Reduced from 8 min to 5 min max to prevent memory issues during TTS
  const targetMinutes = Math.min(5, Math.max(2, Math.floor(wordCount / 1500)));

  // Script: ~150 words/min × 2 speakers = 300 words/min dialogue
  const targetWords = targetMinutes * 300;

  console.log(`[Script Generator] Material: ${wordCount} words → Target: ${targetMinutes}min (${targetWords} words)`);

  return targetWords;
}

/**
 * Helper: Detect gender of a name using Gemini
 * Returns 'M' or 'F' (defaults to 'F' if ambiguous/error, as Kore is the default fun voice)
 */
async function detectGender(name: string): Promise<'M' | 'F'> {
  // Simple heuristic or common names could be cached, but LLM is cheap enough
  try {
    const response = await fetch(`${GEMINI_FLASH_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Classify the name "${name}" as likely Male or Female. Return ONLY "M" or "F". If unknown/object, return "F".` }]
        }],
        generationConfig: { maxOutputTokens: 5, temperature: 0 }
      })
    });
    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase();
    return (result === 'M') ? 'M' : 'F';
  } catch (e) {
    console.warn('Gender detection failed, defaulting to Female:', e);
    return 'F';
  }
}

/**
 * Stage 1: Extract key insights from material using Gemini 2.5 Pro
 */
async function extractKeyInsights(
  materialContent: string,
  notebookTitle: string
): Promise<{ insights: string[]; tokens: number }> {
  console.log('[Script Generator] Stage 1: Extracting key insights...');

  const systemPrompt = `You are an expert educational content analyst. Your task is to extract the most important and interesting insights from study material that would make for an engaging podcast discussion.

Focus on:
1. Core concepts and definitions
2. Surprising or counterintuitive facts
3. Real-world applications and examples
4. Common misconceptions to clarify
5. Connections to broader topics

Extract 5-7 key insights that cover the full scope of the material.`;

  // Truncate material more aggressively to avoid token limits
  // ~4 chars per token, 30k chars ≈ 7.5k input tokens (safe for most models)
  const truncatedMaterial = materialContent.substring(0, 30000);
  console.log(`[Script Generator] Material truncated: ${materialContent.length} → ${truncatedMaterial.length} chars`);

  const userPrompt = `Material Title: ${notebookTitle}

Material Content:
${truncatedMaterial}

Extract 5-7 key insights from this material. For each insight, provide:
- A clear, concise statement (1-2 sentences)
- Why it's important or interesting

Return ONLY a JSON object with this structure:
{
  "insights": [
    "Insight 1: [statement]",
    "Insight 2: [statement]",
    ...
  ]
}`;

  try {
    // Use Flash model for insight extraction (faster, higher limits)
    const response = await fetch(`${GEMINI_FLASH_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: userPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096, // Increased significantly to prevent cutoff
        },
        // Add safety settings to be more permissive for educational content
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Check for API-level errors
    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    if (!data.candidates || data.candidates.length === 0) {
      if (data.promptFeedback?.blockReason) {
        throw new Error(`Content blocked by safety filter: ${data.promptFeedback.blockReason}`);
      }
      throw new Error('Gemini API returned no candidates.');
    }

    const content = data.candidates[0].content.parts[0]?.text || '';
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    // Parse JSON response (strip markdown if present)
    let jsonString = content.trim();
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonString);

    if (!parsed || !parsed.insights || !Array.isArray(parsed.insights)) {
      throw new Error('Invalid response structure: missing insights array');
    }

    console.log(`[Script Generator] Extracted ${parsed.insights.length} insights (${tokens} tokens)`);

    return {
      insights: parsed.insights,
      tokens
    };

  } catch (error: any) {
    console.error('[Script Generator] Stage 1 failed:', error);
    throw new Error(`Failed to extract insights: ${error.message}`);
  }
}

/**
 * Stage 2: Generate Dialogue Script
 */
async function generateDialogueScript(
  insights: string[],
  notebookTitle: string,
  targetWordCount: number,
  petName: string = 'Sparky'
): Promise<{ script: string; tokens: number; speakerMap: Record<string, string> }> {
  console.log(`[Script Generator] Stage 2: Generating dialogue with pet "${petName}"...`);

  // Detect gender to determine voices
  // Default (Female Name): Pet=Kore(F), Teacher=Morgan(M - Puck)
  // Alt (Male Name): Pet=Puck(M), Teacher=Morgana(F - Kore)

  const petGender = await detectGender(petName);
  console.log(`[Script Generator] Detected gender for "${petName}": ${petGender}`);

  const isPetMale = petGender === 'M';

  // Define Characters
  const petCharacter = {
    name: petName,
    voice: isPetMale ? 'Puck' : 'Kore', // Male=Puck, Female=Kore
    role: "The Enthusiastic Learner",
    desc: `A curious, energetic, and slightly playful learner. Represents the user's pet ${petName}. Asks asking clarifying questions, making relatable (sometimes funny) comparisons, and is eager to learn.`
  };

  const teacherCharacter = {
    name: isPetMale ? 'River' : 'Morgan', // River(F) if Pet is Male, Morgan(M) if Pet is Female
    voice: isPetMale ? 'Kore' : 'Puck', // Swap voices to ensure contrast
    role: "The Example-Driven Teacher",
    desc: `A knowledgeable, patient, and warm guide. Explains complex ideas clearly using metaphors. Encouraging and supportive of ${petName}'s progress.`
  };

  const speakerMap = {
    [petCharacter.name]: petCharacter.voice,
    [teacherCharacter.name]: teacherCharacter.voice
  };

  const systemPrompt = `You are a professional educational podcast scriptwriter.
Two hosts:
1. ${petCharacter.name.toUpperCase()} (${petCharacter.role}): ${petCharacter.desc}
2. ${teacherCharacter.name.toUpperCase()} (${teacherCharacter.role}): ${teacherCharacter.desc}

Create a natural, conversational podcast script.

CRITICAL INSTRUCTIONS:
- **INTRODUCTION**: The script MUST start with a brief, friendly introduction where they say hello and ideally mention each other's names so the listener knows who is who.
  - Example: "${teacherCharacter.name}: Welcome back! Today I'm here with ${petCharacter.name}."
  - Example: "${petCharacter.name}: Hey everyone! It's me, ${petCharacter.name}, and I'm ready to learn with ${teacherCharacter.name}!"
- **TONE**: Fun, educational, slightly playful but focused on the content.
- **FORMAT**: Authentic dialogue. Use interjections ("Whoa", "I see", "Wait...").
- **TAKEAWAY**: End with a short summary or encouraging thought.

TARGET: ${targetWordCount} words.`;

  const userPrompt = `Topic: ${notebookTitle}

Key Insights to Cover:
${insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

Generate the podcast script.
FORMAT (pure text with speaker labels):
${teacherCharacter.name}: [Intro]
${petCharacter.name}: [Response]
...

Return ONLY the script.`;

  try {
    const response = await fetch(`${GEMINI_FLASH_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: userPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: Math.max(8192, Math.ceil(targetWordCount * 2)),
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const script = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    const cleanedScript = script.replace(/```.*?\n/g, '').replace(/```/g, '').trim();

    const wordCount = cleanedScript.split(/\s+/).length;
    console.log(`[Script Generator] Generated ${wordCount} word script (${tokens} tokens)`);

    return {
      script: cleanedScript,
      tokens,
      speakerMap
    };

  } catch (error: any) {
    console.error('[Script Generator] Stage 2 failed:', error);
    throw new Error(`Failed to generate script: ${error.message}`);
  }
}

/**
 * Generate complete podcast script (two-stage process)
 */
export async function generatePodcastScript(
  config: ScriptGenerationConfig
): Promise<GeneratedScript> {
  console.log('[Script Generator] Starting two-stage script generation...');
  const startTime = Date.now();

  try {
    // Calculate target word count
    const targetWordCount = calculateTargetWordCount(config.materialContent);

    // Stage 1: Extract key insights
    const { insights, tokens: stage1Tokens } = await extractKeyInsights(
      config.materialContent,
      config.notebookTitle
    );

    // Stage 2: Generate dialogue
    const { script, tokens: stage2Tokens, speakerMap } = await generateDialogueScript(
      insights,
      config.notebookTitle,
      targetWordCount,
      config.petName
    );

    // Calculate metrics
    const totalTokens = stage1Tokens + stage2Tokens;
    const wordCount = script.split(/\s+/).length;
    const estimatedMinutes = wordCount / 300; // ~300 words/min for dialogue

    const costCents = Math.ceil((totalTokens / 1000) * 0.003 * 100);

    const latency = Date.now() - startTime;
    console.log(`[Script Generator] Complete! ${wordCount} words, ${estimatedMinutes.toFixed(1)}min, ${totalTokens} tokens`);

    return {
      script,
      keyInsights: insights,
      wordCount,
      estimatedMinutes,
      llmTokens: totalTokens,
      costCents,
      speakerMap
    };

  } catch (error: any) {
    console.error('[Script Generator] Failed:', error);
    throw new Error(`Script generation failed: ${error.message}`);
  }
}

/**
 * Validate generated script format
 */
export function validateScript(script: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Note: We can't check for specific names anymore since they are dynamic
  // We just check that there are *some* speaker labels (lines starting with "Name:")
  const speakerPattern = /^[A-Z][a-zA-Z\s]+:/m;

  if (!speakerPattern.test(script)) {
    errors.push('Script missing speaker labels (Format: "Name: Dialogue")');
  }

  // Check minimum length
  const wordCount = script.split(/\s+/).length;
  if (wordCount < 100) errors.push(`Script too short (${wordCount} words, minimum 100)`);
  if (wordCount > 4000) errors.push(`Script too long (${wordCount} words, maximum 4000)`);

  return {
    valid: errors.length === 0,
    errors
  };
}
