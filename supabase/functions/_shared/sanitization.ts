/**
 * Content Sanitization for LLM Prompt Injection Prevention
 * Sanitizes user-provided content before inserting into LLM prompts
 */

/**
 * Sanitize text for safe inclusion in LLM prompts
 * Prevents prompt injection attacks by:
 * 1. Removing/escaping control characters
 * 2. Normalizing excessive whitespace
 * 3. Removing potential prompt delimiters
 * 4. Limiting consecutive newlines
 *
 * @param text - User-provided text to sanitize
 * @param options - Sanitization options
 * @returns Sanitized text safe for LLM prompts
 */
export function sanitizeForLLM(
  text: string,
  options: {
    maxLength?: number;
    preserveNewlines?: boolean;
    maxConsecutiveNewlines?: number;
  } = {}
): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const {
    maxLength = 50000,
    preserveNewlines = true,
    maxConsecutiveNewlines = 3,
  } = options;

  let sanitized = text;

  // 0. SECURITY: Normalize Unicode to prevent homoglyph bypass attacks
  // NFKC normalization converts fullwidth/variant characters to their ASCII equivalents
  // e.g., ﹝SYSTEM﹞ → [SYSTEM], ［ＡＳＳＩＳＴＡＮＴ］ → [ASSISTANT]
  try {
    sanitized = sanitized.normalize('NFKC');
  } catch {
    // If normalization fails, continue with original text
    // This shouldn't happen but we fail safely
  }

  // 1. Remove null bytes and other control characters (except newlines/tabs if preserved)
  if (preserveNewlines) {
    // Keep \n, \r, \t but remove other control chars
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    // Remove all control characters including newlines
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ' ');
  }

  // 2. Normalize line endings to \n
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Limit consecutive newlines to prevent prompt structure manipulation
  if (preserveNewlines && maxConsecutiveNewlines > 0) {
    const newlinePattern = new RegExp(`\n{${maxConsecutiveNewlines + 1},}`, 'g');
    const replacement = '\n'.repeat(maxConsecutiveNewlines);
    sanitized = sanitized.replace(newlinePattern, replacement);
  }

  // 4. Normalize whitespace (collapse multiple spaces, but preserve single newlines if configured)
  if (preserveNewlines) {
    // Collapse spaces but keep newlines
    sanitized = sanitized.replace(/[ \t]+/g, ' ');
  } else {
    // Collapse all whitespace to single spaces
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  // 5. Remove potential prompt delimiter patterns that could break context
  // Remove sequences that look like system prompts or role markers
  sanitized = sanitized
    .replace(/\[SYSTEM\]/gi, '[system]')
    .replace(/\[ASSISTANT\]/gi, '[assistant]')
    .replace(/\[USER\]/gi, '[user]')
    .replace(/\[INST\]/gi, '[inst]')
    .replace(/\[\/INST\]/gi, '[/inst]')
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .replace(/```system/gi, '```text')
    .replace(/```assistant/gi, '```text');

  // 6. Escape potential markdown code blocks that could break prompt structure
  // Replace triple backticks with escaped version to prevent LLM confusion
  sanitized = sanitized.replace(/```/g, '` ` `');

  // 7. Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  // 8. Enforce maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    // Try to end at a word boundary
    const lastSpace = sanitized.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.9) {
      sanitized = sanitized.substring(0, lastSpace);
    }
    sanitized = sanitized.trim() + '...';
  }

  return sanitized;
}

/**
 * Sanitize title/short text fields for LLM prompts
 * Stricter sanitization for titles and single-line inputs
 */
export function sanitizeTitle(title: string, maxLength: number = 100): string {
  return sanitizeForLLM(title, {
    maxLength,
    preserveNewlines: false,
    maxConsecutiveNewlines: 0,
  });
}

/**
 * Sanitize array of strings for LLM prompts
 */
export function sanitizeArray(
  items: string[],
  options: {
    maxItems?: number;
    maxItemLength?: number;
  } = {}
): string[] {
  const { maxItems = 100, maxItemLength = 1000 } = options;

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .slice(0, maxItems)
    .map((item) => sanitizeForLLM(item, { maxLength: maxItemLength }))
    .filter((item) => item.length > 0);
}

/**
 * Create a safely delimited context section for LLM prompts
 * Uses clear delimiters to prevent context bleeding
 */
export function createSafeContext(
  content: string,
  label: string = 'CONTEXT'
): string {
  const sanitizedContent = sanitizeForLLM(content, {
    maxLength: 50000,
    preserveNewlines: true,
    maxConsecutiveNewlines: 2,
  });

  const sanitizedLabel = sanitizeTitle(label, 50);

  // Use clear delimiters that are unlikely to appear in user content
  return `
=== BEGIN ${sanitizedLabel} ===
${sanitizedContent}
=== END ${sanitizedLabel} ===
`.trim();
}

/**
 * Validate that sanitization didn't reduce content to nothing
 */
export function validateSanitizedContent(
  original: string,
  sanitized: string,
  minLength: number = 10
): { isValid: boolean; error?: string } {
  if (!sanitized || sanitized.length < minLength) {
    return {
      isValid: false,
      error: `Content too short after sanitization (${sanitized.length} chars, min ${minLength})`,
    };
  }

  // Check if sanitization removed too much (> 50% reduction might indicate malicious content)
  const reductionRatio = 1 - (sanitized.length / original.length);
  if (reductionRatio > 0.5 && original.length > 100) {
    return {
      isValid: false,
      error: `Content excessively reduced during sanitization (${Math.round(reductionRatio * 100)}% removed)`,
    };
  }

  return { isValid: true };
}
