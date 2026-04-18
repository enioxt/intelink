/**
 * Security Utilities — EGOS Inteligência
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Security helpers and sanitization
 */

import DOMPurify from 'isomorphic-dompurify';

// Sanitize HTML content
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

// Sanitize plain text (remove all HTML)
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

// Escape special regex characters
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Generate CSRF token
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Store CSRF token
export function storeCSRFToken(token: string): void {
  sessionStorage.setItem('csrf_token', token);
}

// Get stored CSRF token
export function getCSRFToken(): string | null {
  return sessionStorage.getItem('csrf_token');
}

// Verify CSRF token
export function verifyCSRFToken(token: string): boolean {
  const stored = getCSRFToken();
  return stored !== null && stored === token;
}

// Rate limiting helper (client-side)
export class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits: Map<string, { max: number; windowMs: number }> = new Map();

  setLimit(key: string, maxRequests: number, windowMs: number): void {
    this.limits.set(key, { max: maxRequests, windowMs });
  }

  canProceed(key: string): boolean {
    const limit = this.limits.get(key);
    if (!limit) return true;

    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    
    // Remove old requests outside window
    const validTimestamps = timestamps.filter(
      (t) => now - t < limit.windowMs
    );
    
    if (validTimestamps.length >= limit.max) {
      return false;
    }
    
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }

  getTimeUntilNext(key: string): number {
    const limit = this.limits.get(key);
    if (!limit) return 0;

    const timestamps = this.requests.get(key) || [];
    if (timestamps.length === 0) return 0;

    const oldest = timestamps[0];
    const resetTime = oldest + limit.windowMs;
    return Math.max(0, resetTime - Date.now());
  }
}

// Create rate limiter instance
export const apiRateLimiter = new ClientRateLimiter();
apiRateLimiter.setLimit('search', 10, 60 * 1000); // 10 per minute
apiRateLimiter.setLimit('export', 5, 60 * 1000); // 5 per minute
apiRateLimiter.setLimit('chat', 30, 60 * 1000); // 30 per minute

// Check for suspicious input (basic XSS/SQLi detection)
export function isSuspiciousInput(input: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onload, etc
    /SELECT\s+.*FROM/i,
    /INSERT\s+INTO/i,
    /DELETE\s+FROM/i,
    /DROP\s+TABLE/i,
    /UNION\s+SELECT/i,
  ];
  
  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

// Secure random string
export function secureRandomString(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, length);
}

// Hash string (simple, not for passwords)
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Constant time comparison (prevents timing attacks)
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default {
  sanitizeHTML,
  sanitizeText,
  escapeRegex,
  generateCSRFToken,
  storeCSRFToken,
  getCSRFToken,
  verifyCSRFToken,
  ClientRateLimiter,
  apiRateLimiter,
  isSuspiciousInput,
  secureRandomString,
  hashString,
  constantTimeCompare,
};
