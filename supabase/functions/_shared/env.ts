/**
 * Environment Variable Utilities
 * Provides safe access to environment variables with clear error messages
 */

/**
 * Get a required environment variable
 * Throws a descriptive error if the variable is missing
 * @param key - The environment variable key
 * @returns The environment variable value
 * @throws Error if the variable is missing
 */
export function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Please configure it in Supabase Edge Function secrets.`
    );
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 * @param key - The environment variable key
 * @param defaultValue - The default value to use if the variable is not set
 * @returns The environment variable value or the default value
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return Deno.env.get(key) || defaultValue;
}







