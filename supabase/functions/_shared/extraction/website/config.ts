/**
 * Website Content Extraction Configuration
 * Configuration for website extraction services
 */

import { getOptionalEnv, getRequiredEnv } from '../../env.ts';

/**
 * Configuration for website extraction services
 */
export const WEBSITE_CONFIG = {
  jinaReader: {
    enabled: true,
    baseUrl: 'https://r.jina.ai',
    apiKeyEnvVar: 'JINA_API_KEY',
    headers: {
      accept: 'application/json',
      retainImages: 'none', // Don't include images to save tokens
    },
  },
  gemini: {
    enabled: true,
    apiKeyEnvVar: 'GOOGLE_AI_API_KEY',
    model: 'gemini-2.0-flash',
    temperature: 0.1,
    maxOutputTokens: 8192,
    maxHtmlLength: 100000, // ~25k tokens
    systemPrompt:
      'Extract the main article/content from this HTML page. Return only the extracted content in clean markdown format. Remove navigation, ads, footers, and other non-content elements. Preserve headings, lists, and important formatting.',
  },
  directFetch: {
    userAgent: 'Mozilla/5.0 (compatible; BrigoBot/1.0; +https://brigo.app)',
    acceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
} as const;

/**
 * Get optional Jina API key
 * Works without API key but has lower rate limits
 */
export function getJinaApiKey(): string {
  return getOptionalEnv(WEBSITE_CONFIG.jinaReader.apiKeyEnvVar, '');
}

/**
 * Get required Gemini API key for website cleanup
 */
export function getGeminiWebApiKey(): string {
  return getRequiredEnv(WEBSITE_CONFIG.gemini.apiKeyEnvVar);
}
