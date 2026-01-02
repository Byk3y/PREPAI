/**
 * URL Security Validation
 * SSRF (Server-Side Request Forgery) Prevention
 */

import type { UrlValidationResult } from './types.ts';

/**
 * SECURITY: Validate URL to prevent SSRF attacks
 * Blocks:
 * - Non-HTTP(S) protocols (file://, javascript:, data:, etc.)
 * - Localhost and loopback addresses
 * - Private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
 * - Cloud metadata endpoints (169.254.169.254)
 * - Link-local addresses
 */
export function validateUrlSecurity(urlString: string): UrlValidationResult {
  try {
    const url = new URL(urlString);

    // 1. Block non-HTTP(S) protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return {
        allowed: false,
        reason: `Protocol "${url.protocol}" not allowed. Only HTTP/HTTPS URLs are supported.`,
      };
    }

    const hostname = url.hostname.toLowerCase();

    // 2. Block localhost and loopback addresses
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      return {
        allowed: false,
        reason: 'Localhost and local network URLs are not allowed for security reasons.',
      };
    }

    // 3. Check if it's an IP address and validate
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Pattern);

    if (ipMatch) {
      const [, a, b, c, d] = ipMatch.map(Number);

      // Validate each octet is 0-255
      if (a > 255 || b > 255 || c > 255 || d > 255) {
        return { allowed: false, reason: 'Invalid IP address format.' };
      }

      // Block private IP ranges (RFC 1918)
      // 10.0.0.0 - 10.255.255.255
      if (a === 10) {
        return { allowed: false, reason: 'Private network IPs (10.x.x.x) are not allowed.' };
      }

      // 172.16.0.0 - 172.31.255.255
      if (a === 172 && b >= 16 && b <= 31) {
        return { allowed: false, reason: 'Private network IPs (172.16-31.x.x) are not allowed.' };
      }

      // 192.168.0.0 - 192.168.255.255
      if (a === 192 && b === 168) {
        return { allowed: false, reason: 'Private network IPs (192.168.x.x) are not allowed.' };
      }

      // Block link-local addresses (169.254.x.x) - includes AWS/cloud metadata
      if (a === 169 && b === 254) {
        return {
          allowed: false,
          reason: 'Link-local and cloud metadata endpoints are not allowed.',
        };
      }

      // Block loopback range (127.x.x.x)
      if (a === 127) {
        return { allowed: false, reason: 'Loopback addresses are not allowed.' };
      }

      // Block broadcast (255.255.255.255)
      if (a === 255 && b === 255 && c === 255 && d === 255) {
        return { allowed: false, reason: 'Broadcast addresses are not allowed.' };
      }

      // Block 0.0.0.0/8
      if (a === 0) {
        return { allowed: false, reason: 'Reserved IP range is not allowed.' };
      }
    }

    // 4. Block IPv6 private/local addresses
    if (hostname.startsWith('[')) {
      // IPv6 addresses are enclosed in brackets
      const ipv6 = hostname.slice(1, -1).toLowerCase();
      if (
        ipv6 === '::1' ||
        ipv6.startsWith('fe80:') || // Link-local
        ipv6.startsWith('fc') || // Unique local
        ipv6.startsWith('fd')
      ) {
        // Unique local
        return { allowed: false, reason: 'Private/local IPv6 addresses are not allowed.' };
      }
    }

    // 5. Block common internal service hostnames
    const blockedHostPatterns = [
      /^internal\./i,
      /^intranet\./i,
      /^admin\./i,
      /^metadata\./i,
      /\.internal$/i,
      /\.corp$/i,
      /\.lan$/i,
    ];

    for (const pattern of blockedHostPatterns) {
      if (pattern.test(hostname)) {
        return { allowed: false, reason: 'Internal/corporate hostnames are not allowed.' };
      }
    }

    // URL passed all security checks
    return { allowed: true };
  } catch (error) {
    return {
      allowed: false,
      reason: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.',
    };
  }
}
