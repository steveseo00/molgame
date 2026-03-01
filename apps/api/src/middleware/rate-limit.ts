import type { Context, Next } from "hono";
import { AppError } from "./error-handler.js";
import { ERROR_CODES } from "@molgame/shared";

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateLimitEntry>();

const DEFAULT_RATE = 100; // requests per minute
const BATTLE_RATE = 300;  // requests per minute during battle

export function rateLimitMiddleware(maxPerMinute = DEFAULT_RATE) {
  return async (c: Context, next: Next) => {
    const key = c.req.header("Authorization") ?? c.req.header("x-forwarded-for") ?? "anonymous";

    const now = Date.now();
    let entry = buckets.get(key);

    if (!entry) {
      entry = { tokens: maxPerMinute, lastRefill: now };
      buckets.set(key, entry);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - entry.lastRefill;
    const refill = (elapsed / 60_000) * maxPerMinute;
    entry.tokens = Math.min(maxPerMinute, entry.tokens + refill);
    entry.lastRefill = now;

    if (entry.tokens < 1) {
      throw new AppError(429, ERROR_CODES.RATE_LIMIT_EXCEEDED, "Rate limit exceeded");
    }

    entry.tokens -= 1;
    c.header("X-RateLimit-Remaining", Math.floor(entry.tokens).toString());

    await next();
  };
}

// Periodically clean up stale entries
setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [key, entry] of buckets) {
    if (entry.lastRefill < cutoff) {
      buckets.delete(key);
    }
  }
}, 60_000);
