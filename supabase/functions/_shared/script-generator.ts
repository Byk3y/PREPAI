/**
 * Podcast Script Generator using Gemini 2.5 Pro
 * Two-stage process:
 *   1. Extract key insights from material
 *   2. Generate Dialogue script (Brigo & Pet)
 */

import { getRequiredEnv } from './env.ts';

// Use gemini-2.0-flash for faster and more reliable insight extraction
const GEMINI_FLASH_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface ScriptGenerationConfig {
  materialContent: string; // Full extracted text from material
  notebookTitle: string; // Title of the notebook
  materialKind?: string; // Type of material (pdf, website, youtube, etc.)
  targetDurationMinutes?: number; // Target audio duration (2-5 minutes for now)
  petName?: string; // Optional pet name (default: "Nova")
  educationLevel?: string; // User education level
  ageBracket?: string; // User age bracket
}

export interface GeneratedScript {
  script: string; // Full dialogue with speaker labels
  keyInsights: string[]; // Key points extracted (for reference)
  wordCount: number;
  estimatedMinutes: number;
  llmTokens: number; // Total tokens used
  costCents: number; // Estimated cost
  speakerMap: Record<string, string>; // Map speaker names to voices
}

/**
 * Calculate target word count based on material complexity and duration constraints.
 * Optimized for Free Tier stability and premium pacing.
 */
function calculateTargetWordCount(materialContent: string): number {
  const charCount = materialContent.length;
  const wordCount = materialContent.split(/\s+/).length;

  // PREMIUM LOGIC: Scale based on chars to capture density.
  // min 400 words (2.5min), max 1000 words (6min) for now (to avoid timeouts)
  const targetWords = Math.max(400, Math.min(1000, Math.floor(charCount / 20)));

  const estimatedMinutes = targetWords / 160; // Natural podcast pace

  console.log(`[Script Generator] Material: ${wordCount} words (${charCount} chars) → Target: ${estimatedMinutes.toFixed(1)}min (${targetWords} words)`);

  return targetWords;
}

/**
 * Maps database keys to rich persona descriptions for the LLM
 */
function getPersonaGuide(educationLevel: string, ageBracket: string): string {
  const eduMap: Record<string, string> = {
    'middle_school': 'User is a young student. Simplify complex jargon into high-relatability analogies. Avoid being condescending.',
    'high_school': 'User is a teenager prepping for exams. Focus on clear concepts, memory anchors, and "why this matters" for grades/life.',
    'undergrad': 'User is an academic focused on deep retention. Use rigorous logic. Connect insights to research or "exam pitfalls".',
    'grad_school': 'User is a specialist. Use sophisticated terminology. Focus on nuance, high-level synthesis, and theory-to-practice.',
    'professional': 'User is a high-performer. Focus on ROI, strategic application, and efficiency. Use workplace/growth analogies.',
    'lifelong': 'User is learning for pleasure. Focus on the beauty of the concept and historical/global context. Keep it sophisticated and conversational.'
  };

  const ageMap: Record<string, string> = {
    'under_18': 'TONE: Gen Z / Chronically Online. Vibe is "FaceTime with a smart friend". Use slang structures (e.g. "lowkey", "it\'s giving", "main character energy") authentically. Avoid "cringe" by not overdoing it.',
    '18_24': 'TONE: Contemporary/Student. High energy, relatable, and authentic. Use modern analogies (digital culture, social media). Pacing should be fast and punchy.',
    '25_34': 'TONE: Balanced/Professional. High-end educational podcast vibe (like "Hidden Brain"). Sophisticated but accessible. Pacing is natural.',
    '35_44': 'TONE: Established/Executive. Professional masterclass vibe. Focus on depth and maturity. Use business or parenting analogies.',
    '45_plus': 'TONE: Sophisticated/Thoughtful. Measured pacing. Focus on wisdom, legacy, and broader world impact. Masterclass/Executive briefing vibe.'
  };

  const eduGuide = eduMap[educationLevel] || eduMap['lifelong'];
  const ageGuide = ageMap[ageBracket] || ageMap['25_34'];

  return `USER PERSONA:\n- LEVEL: ${eduGuide}\n- STYLE: ${ageGuide}`;
}

/**
 * Stage 1: Extract key insights from material using Gemini 2.0 Flash
 */
async function extractKeyInsights(
  materialContent: string,
  notebookTitle: string,
  educationLevel: string = 'lifelong'
): Promise<{ insights: string[]; tokens: number }> {
  const GEMINI_API_KEY = getRequiredEnv('GOOGLE_AI_API_KEY');
  console.log('[Script Generator] Stage 1: Extracting key insights...');

  const systemPrompt = `You are an expert educational content analyst. Your task is to extract the most important insights from study material for an engaging podcast.

ADAPTIVITY RULE:
- For Professionals/Lifelong Learners: Prioritize strategic "big picture" insights and real-world ROI.
- For Students (Middle/High/Undergrad): Prioritize core definitions, common hurdles, and fundamental mechanisms.

Focus on:
1. Core concepts and definitions
2. Surprising or counterintuitive facts
3. Real-world applications and examples
4. Common misconceptions to clarify
5. Connections to broader topics

Extract 5-7 key insights that cover the full scope of the material.`;

  // Truncate material to avoid token limits and save time
  const truncatedMaterial = materialContent.substring(0, 30000);

  const userPrompt = `Material Title: ${notebookTitle}
User Level: ${educationLevel}

Material Content:
${truncatedMaterial}

Extract 5-7 key insights. Return ONLY a JSON object with this structure:
{
  "insights": [
    "Insight 1: [statement]",
    "Insight 2: [statement]",
    ...
  ]
}`;
  try {
    const response = await fetch(`${GEMINI_FLASH_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemPrompt }, { text: userPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
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
    if (data.error) throw new Error(`Gemini API error: ${data.error.message}`);

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    let jsonString = content.trim();
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonString = jsonMatch[1].trim();

    const parsed = JSON.parse(jsonString);
    return { insights: parsed.insights, tokens };
  } catch (error: any) {
    console.error('[Script Generator] Stage 1 failed:', error);
    throw new Error(`Failed to extract insights: ${error.message}`);
  }
}

/**
 * Stage 2: Generate Dialogue Script (Brigo & Pet)
 */
async function generateDialogueScript(
  insights: string[],
  notebookTitle: string,
  targetWordCount: number,
  petName: string = 'Nova',
  materialKind?: string,
  educationLevel: string = 'lifelong',
  ageBracket: string = '25_34'
): Promise<{ script: string; tokens: number; speakerMap: Record<string, string> }> {
  console.log(`[Script Generator] Stage 2: Generating dialogue with Brigo and ${petName}...`);

  const brigoName = 'Brigo';
  const speakerMap = {
    [brigoName]: 'Charon',
    [petName]: 'Puck'
  };

  const personaGuide = getPersonaGuide(educationLevel, ageBracket);
  const kindDescriptor = materialKind ? `the ${materialKind}` : 'the material';
  const introRitual = `${brigoName}: Welcome back. I'm ${brigoName}, and ${petName} is here to help me break down your notes on ${notebookTitle}.`;

  const systemPrompt = `You are a professional educational podcast scriptwriter.
Two hosts:
1. ${brigoName.toUpperCase()} (The Sage): Intelligent, dry humor, authority figure. Brigo is an AI who has analyzed millions of textbooks but keeps it conversational. Pronounced "BRIG-oh".
2. ${petName.toUpperCase()} (The Insight): Relatable, curious, and clever. The user's study partner. The Pet's goal is to turn "textbook talk" into "real talk".

${personaGuide}

CRITICAL STRUCTURAL RULES:
- **THE RITUAL OPENING**: The script MUST start EXACTLY with: "${introRitual}" followed by a warm banter moment.
- **PERSONALIZED ANALOGIES**: ${petName} MUST use analogies that resonate with the user persona provided. 
- **ANTI-CRINGE RULE**: For Gen Z personas, avoid outdated slang. Use authentic linguistic structures (like "wait, let them cook," "for real," or "lowkey") only when they fit the flow. Focus on pacing.
- **THE INSIGHT LOOP**: For every concept:
    - Brigo explains the **Mechanism** (The technical "How").
    - ${petName} follows with the **Meaning** (The relatable analogy or "Why it matters").
- **SOURCE AWARENESS**: Mention you are looking at ${kindDescriptor} provided by the user.
- **NO ROBOTIC TURN-TAKING**: Interrupt each other naturally ("Hold on," "Exactly!"). Use interjections like "Huh," "Whoa," and "I see."
- **THE BATTLE OF THE TAKEAWAYS**: End with a "Double-Lock" takeaway:
    - Brigo gives one "Power Fact".
    - ${petName} counters with one "Sticky Note" (mnemonic/catchphrase).
    - End with an encouraging sign-off.

TARGET: Exactly ${targetWordCount} words.`;

  const userPrompt = `Topic: ${notebookTitle}
Key Insights:
${insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

Generate the script. Return ONLY the script text with "Brigo:" and "${petName}:" labels.`;

  const GEMINI_API_KEY = getRequiredEnv('GOOGLE_AI_API_KEY');
  try {
    const response = await fetch(`${GEMINI_FLASH_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemPrompt }, { text: userPrompt }]
        }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 4096,
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

    console.log(`[Script Generator] Generated ${wordCount} word script.`);

    return { script: cleanedScript, tokens, speakerMap };
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
  const startTime = Date.now();

  try {
    const targetWordCount = calculateTargetWordCount(config.materialContent);

    const { insights, tokens: stage1Tokens } = await extractKeyInsights(
      config.materialContent,
      config.notebookTitle
    );

    const { script, tokens: stage2Tokens, speakerMap } = await generateDialogueScript(
      insights,
      config.notebookTitle,
      targetWordCount,
      config.petName,
      config.materialKind,
      config.educationLevel,
      config.ageBracket
    );

    const totalTokens = stage1Tokens + stage2Tokens;
    const wordCount = script.split(/\s+/).length;
    const estimatedMinutes = wordCount / 160;

    const costCents = Math.ceil((totalTokens / 1000) * 0.003 * 100);

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
  const speakerPattern = /^[A-Z][a-zA-Z\s]+:/m;

  if (!speakerPattern.test(script)) {
    errors.push('Script missing speaker labels (Format: "Name: Dialogue")');
  }

  const wordCount = script.split(/\s+/).length;
  if (wordCount < 100) errors.push(`Script too short (${wordCount} words)`);

  return {
    valid: errors.length === 0,
    errors
  };
}
