/**
 * CORS Utility
 * Validates and returns appropriate CORS headers based on request origin
 */

import { getOptionalEnv } from './env.ts';

/**
 * Get CORS headers for a request
 * Validates origin against allowed origins list
 * 
 * Note: For mobile apps (React Native/Expo), CORS is less critical as they don't
 * typically send Origin headers. Defaults to '*' (allow all) for development.
 * In production, set ALLOWED_ORIGINS to specific web origins if you have a web app.
 * 
 * @param request - The incoming request
 * @returns CORS headers object
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  // Default to '*' for mobile apps - can be restricted in production if needed
  const allowedOrigins = getOptionalEnv('ALLOWED_ORIGINS', '*').split(',').map(o => o.trim());
  
  // Default headers
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // If allowedOrigins contains '*', allow all origins (development mode)
  if (allowedOrigins.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
    return headers;
  }

  // If no origin header, return headers without Access-Control-Allow-Origin
  // (some requests like mobile apps don't send origin)
  if (!origin) {
    return headers;
  }

  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    // Origin not allowed - return headers without Access-Control-Allow-Origin
    // This will cause browser to block the request
    // For mobile apps, this is fine as they don't use CORS
  }

  return headers;
}

/**
 * Get CORS headers for preflight OPTIONS requests
 * @param request - The incoming request
 * @returns CORS headers for preflight
 */
export function getCorsPreflightHeaders(request: Request): Record<string, string> {
  const headers = getCorsHeaders(request);
  
  // Add preflight-specific headers
  headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  headers['Access-Control-Max-Age'] = '86400'; // 24 hours

  return headers;
}

