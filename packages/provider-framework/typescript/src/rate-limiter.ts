/**
 * @osp/provider - In-memory rate limiter
 *
 * Implements the IETF draft rate limit headers as required by OSP spec Section 8.6:
 *   - RateLimit-Limit: Maximum requests per window
 *   - RateLimit-Remaining: Remaining requests in current window
 *   - RateLimit-Reset: Seconds until window resets
 *
 * Uses a sliding window counter per IP address.
 */

import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export interface RateLimiterOptions {
  /** Window duration in milliseconds. Default: 60000 (1 minute) */
  windowMs: number;
  /** Maximum requests within the window. Default: 60 */
  maxRequests: number;
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
  windowMs: 60_000,
  maxRequests: 60,
};

/**
 * Creates an in-memory rate limiter middleware that adds OSP-compliant
 * rate limit headers to all responses and returns 429 when exceeded.
 */
export function createRateLimiter(
  opts: Partial<RateLimiterOptions> = {}
) {
  const options: RateLimiterOptions = { ...DEFAULT_OPTIONS, ...opts };
  const store = new Map<string, RateLimitEntry>();

  // Periodically clean up expired entries to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.windowStart >= options.windowMs) {
        store.delete(key);
      }
    }
  }, options.windowMs * 2);

  // Allow the timer to not block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const key = getClientKey(req);
    const now = Date.now();

    let entry = store.get(key);

    // Reset window if expired
    if (!entry || now - entry.windowStart >= options.windowMs) {
      entry = { count: 0, windowStart: now };
      store.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, options.maxRequests - entry.count);
    const resetSeconds = Math.ceil(
      (entry.windowStart + options.windowMs - now) / 1000
    );

    // Set IETF standard rate limit headers (OSP spec Section 8.6)
    res.setHeader('RateLimit-Limit', options.maxRequests.toString());
    res.setHeader('RateLimit-Remaining', remaining.toString());
    res.setHeader('RateLimit-Reset', resetSeconds.toString());

    if (entry.count > options.maxRequests) {
      res.setHeader('Retry-After', resetSeconds.toString());
      res.status(429).json({
        error: 'Rate limit exceeded. Please retry after the specified delay.',
        code: 'rate_limited',
        details: {
          retry_after_seconds: resetSeconds,
          limit: options.maxRequests,
          window_ms: options.windowMs,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Extract a client identifier for rate limiting.
 * Uses X-Forwarded-For if present, otherwise falls back to remote address.
 */
function getClientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}
