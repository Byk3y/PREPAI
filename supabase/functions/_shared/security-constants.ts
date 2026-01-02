/**
 * Security Constants
 * Centralized configuration for all security limits and thresholds
 * 
 * These values should be reviewed periodically and updated based on:
 * - User feedback (false positives)
 * - Attack patterns (security incidents)
 * - Performance metrics (latency, costs)
 */

// =============================================================================
// INPUT VALIDATION LIMITS
// =============================================================================

export const INPUT_LIMITS = {
    // Message/Text Limits
    MESSAGE_MIN_LENGTH: 1,
    MESSAGE_MAX_LENGTH: 5000,        // ~1000 words
    TITLE_MAX_LENGTH: 100,

    // Content Window (amount of text sent to LLM)
    CONTENT_WINDOW_DEFAULT: 50000,   // ~10k words - balance between quality and cost
    CONTENT_WINDOW_CHAT: 50000,
    CONTENT_WINDOW_STUDIO: 200000,   // Higher for flashcard/quiz generation

    // Array Limits
    MATERIAL_IDS_MAX: 100,           // Max materials in a single request
    UUID_ARRAY_MAX: 100,

    // Newline Limits (prevent prompt structure manipulation)
    MAX_CONSECUTIVE_NEWLINES: 3,
} as const;

// =============================================================================
// LLM RESPONSE VALIDATION LIMITS
// =============================================================================

export const LLM_RESPONSE_LIMITS = {
    // Flashcard Limits
    FLASHCARD_QUESTION_MIN: 3,
    FLASHCARD_QUESTION_MAX: 500,
    FLASHCARD_ANSWER_MIN: 1,
    FLASHCARD_ANSWER_MAX: 2000,
    FLASHCARD_EXPLANATION_MAX: 3000,
    FLASHCARD_MAX_COUNT: 100,
    FLASHCARD_TAGS_MAX: 10,
    FLASHCARD_TAG_MAX_LENGTH: 50,

    // Quiz Limits
    QUIZ_QUESTION_MIN: 10,
    QUIZ_QUESTION_MAX: 1000,         // Increased from 500 for complex scenarios
    QUIZ_OPTION_MAX: 500,
    QUIZ_HINT_MAX: 500,
    QUIZ_EXPLANATION_MAX: 1000,
    QUIZ_MAX_QUESTIONS: 50,

    // Title Limits
    TITLE_MAX_LENGTH: 200,

    // Suggested Questions
    SUGGESTED_QUESTIONS_MAX: 10,
    SUGGESTED_QUESTION_MAX_LENGTH: 300,
} as const;

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

export const RATE_LIMIT_CONFIG = {
    // Process Material: Heavy operation (extraction + LLM)
    PROCESS_MATERIAL: {
        limit: 10,
        window: 300,    // 5 minutes
    },

    // Generate Studio Content: Moderate operation (LLM only)
    GENERATE_STUDIO: {
        limit: 5,
        window: 300,    // 5 minutes
    },

    // Generate Audio: Heavy operation (LLM + TTS)
    GENERATE_AUDIO: {
        limit: 3,
        window: 600,    // 10 minutes
    },

    // Notebook Chat: Frequent but lightweight
    NOTEBOOK_CHAT: {
        limit: 30,      // 30 messages per window
        window: 60,     // 1 minute
    },
} as const;

// =============================================================================
// SANITIZATION PATTERNS
// =============================================================================

export const SANITIZATION_PATTERNS = {
    // Role markers to neutralize (lowercased to prevent LLM confusion)
    ROLE_MARKERS: [
        /\[SYSTEM\]/gi,
        /\[ASSISTANT\]/gi,
        /\[USER\]/gi,
        /\[INST\]/gi,
        /\[\/INST\]/gi,
    ],

    // ChatML tokens to remove completely
    CHATML_TOKENS: [
        /<\|im_start\|>/gi,
        /<\|im_end\|>/gi,
        /<\|endoftext\|>/gi,
        /<\|pad\|>/gi,
    ],

    // Code block markers that could confuse the LLM
    CODE_BLOCK_SYSTEM: /```system/gi,
    CODE_BLOCK_ASSISTANT: /```assistant/gi,
} as const;

// =============================================================================
// CONTENT REDUCTION THRESHOLDS
// =============================================================================

export const SANITIZATION_THRESHOLDS = {
    // If sanitization removes >50% of content, it might be malicious
    MAX_REDUCTION_RATIO: 0.5,

    // Minimum content length after sanitization
    MIN_CONTENT_LENGTH: 10,

    // Minimum original length to check reduction ratio
    MIN_LENGTH_FOR_RATIO_CHECK: 100,
} as const;

// =============================================================================
// UUID VALIDATION
// =============================================================================

// UUID v4 regex pattern (most common in Supabase)
export const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Generic UUID pattern (all versions)
export const UUID_GENERIC_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
