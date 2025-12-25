/**
 * OpenRouter LLM Client with Cost Tracking
 * Unified interface for calling any LLM model with automatic cost calculation
 */

import { getRequiredEnv } from './env.ts';

interface ModelConfig {
  name: string;
  maxTokens: number;
  costPer1kInput: number; // USD
  costPer1kOutput: number; // USD
}

interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costCents: number;
  latency: number;
  model: string;
}

// Model configurations for different job types
const MODELS: Record<string, ModelConfig> = {
  preview: {
    name: 'x-ai/grok-4.1-fast', // FREE on OpenRouter! 2M context window
    maxTokens: 1000, // Increased for comprehensive narrative overview (150-200 words)
    costPer1kInput: 0.0, // FREE
    costPer1kOutput: 0.0, // FREE
  },
  studio: {
    name: 'x-ai/grok-4.1-fast', // High quality for flashcards/quiz with 128k context window
    maxTokens: 4000, // Increased for batch generation
    costPer1kInput: 0.0005, // $0.50 per 1M tokens
    costPer1kOutput: 0.0015, // $1.50 per 1M tokens
  },
  audio_script: {
    name: 'anthropic/claude-3.5-sonnet',
    maxTokens: 1500,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  notebook_chat: {
    name: 'x-ai/grok-4.1-fast', // User request
    maxTokens: 2000,
    costPer1kInput: 0.0,
    costPer1kOutput: 0.0,
  },
};

// Fallback models if primary fails
const FALLBACK_MODELS: Record<string, string[]> = {
  preview: ['deepseek/deepseek-chat', 'qwen/qwen-2.5-7b-instruct', 'mistralai/mistral-small'],
  studio: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-2.0-flash-exp'],
  audio_script: ['openai/gpt-4o-mini'],
  notebook_chat: ['google/gemini-2.0-flash-exp', 'anthropic/claude-3.5-haiku'],
};

/**
 * Call LLM model via OpenRouter with automatic cost tracking
 */
export async function callLLM(
  jobType: 'preview' | 'studio' | 'audio_script' | 'notebook_chat',
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number;
    model?: string; // Optional: override default model
    stream?: boolean; // Enable streaming
  } = {}
): Promise<LLMResponse> {
  const config = MODELS[jobType];
  const modelName = options.model || config.name;
  const startTime = Date.now();

  const apiKey = getRequiredEnv('OPENROUTER_API_KEY');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://brigo.app',
        'X-Title': 'Brigo Study App',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: config.maxTokens,
        temperature: options.temperature ?? 0.7,
        stream: options.stream ?? false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const latency = Date.now() - startTime;

    // Extract usage stats
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // Calculate cost in cents
    const costCents = Math.ceil(
      (inputTokens / 1000) * config.costPer1kInput * 100 +
      (outputTokens / 1000) * config.costPer1kOutput * 100
    );

    // Extract content
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('Empty response from LLM');
    }

    return {
      content,
      usage: { inputTokens, outputTokens, totalTokens },
      costCents,
      latency,
      model: modelName,
    };
  } catch (error: unknown) {
    const latency = Date.now() - startTime;

    // Try fallback models if available
    const fallbacks = FALLBACK_MODELS[jobType];
    if (fallbacks && fallbacks.length > 0 && !options.model) {
      console.warn(`Primary model failed, trying fallback: ${fallbacks[0]}`);
      return callLLM(jobType, systemPrompt, userPrompt, {
        ...options,
        model: fallbacks[0],
      });
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM call failed: ${message} (latency: ${latency}ms)`);
  }
}

/**
 * Simple retry wrapper with exponential backoff
 */
export async function callLLMWithRetry(
  jobType: 'preview' | 'studio' | 'audio_script' | 'notebook_chat',
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxRetries?: number; stream?: boolean }
): Promise<LLMResponse> {
  const maxRetries = options?.maxRetries || 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await callLLM(jobType, systemPrompt, userPrompt, options);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      console.error(`LLM call attempt ${attempt + 1} failed:`, err.message);

      // Don't retry on certain errors (auth, invalid request)
      if (
        err.message.includes('401') ||
        err.message.includes('400') ||
        err.message.includes('invalid')
      ) {
        throw err;
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('LLM call failed after retries');
}
