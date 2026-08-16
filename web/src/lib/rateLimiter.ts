/**
 * SABJIWALAA ५ — Client-Side Rate Limiter
 * Prevents abuse of actions like placing orders, applying coupons, etc.
 * Uses a sliding window counter pattern stored in memory.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check if an action is rate-limited.
 * @param key - Unique identifier for the action (e.g., "placeOrder:user@email.com")
 * @param maxAttempts - Maximum number of attempts allowed within the window
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 * @returns { allowed: boolean, retryAfterMs: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const now = Date.now();
  const entry = store.get(key) || { timestamps: [] };

  // Remove expired timestamps outside the window
  entry.timestamps = entry.timestamps.filter(ts => now - ts < windowMs);

  if (entry.timestamps.length >= maxAttempts) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestInWindow);
    return {
      allowed: false,
      retryAfterMs: Math.max(0, retryAfterMs),
      remaining: 0
    };
  }

  // Record this attempt
  entry.timestamps.push(now);
  store.set(key, entry);

  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: maxAttempts - entry.timestamps.length
  };
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Pre-configured rate limiters for specific actions
 */
export const RateLimits = {
  /** Place order: max 3 per minute */
  placeOrder: (userId: string) => checkRateLimit(`placeOrder:${userId}`, 3, 60000),

  /** Apply coupon: max 5 per minute */
  applyCoupon: (userId: string) => checkRateLimit(`applyCoupon:${userId}`, 5, 60000),

  /** Sign in attempts: max 5 per 5 minutes */
  signIn: (email: string) => checkRateLimit(`signIn:${email}`, 5, 300000),

  /** Search queries: max 30 per minute */
  search: (userId: string) => checkRateLimit(`search:${userId}`, 30, 60000),

  /** Admin actions: max 10 per minute */
  adminAction: (userId: string) => checkRateLimit(`admin:${userId}`, 10, 60000),

  /** Status updates: max 20 per minute */
  statusUpdate: (userId: string) => checkRateLimit(`statusUpdate:${userId}`, 20, 60000),
};
