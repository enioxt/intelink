/**
 * AUTH-011: In-memory rate limiter for auth endpoints.
 *
 * Single-instance deployment — no Redis needed. Resets on server restart (acceptable
 * for internal police app; persistent state adds infra complexity without real gain).
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (entry.resetAt < now) store.delete(key);
    }
}, 5 * 60 * 1000);

/**
 * Returns true (blocked) if the key has exceeded the limit within the window.
 * Key should include endpoint + IP/email to scope the limit.
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }

    entry.count += 1;
    if (entry.count > limit) return true;
    return false;
}

/** Returns seconds until the rate limit resets for a given key. */
export function retryAfterSeconds(key: string): number {
    const entry = store.get(key);
    if (!entry) return 0;
    return Math.ceil((entry.resetAt - Date.now()) / 1000);
}
