/**
 * lib/rate-limit/index.ts
 *
 * Per-user rate limiting. Uses Upstash Redis when configured, falls back
 * to an in-memory sliding window when UPSTASH_REDIS_REST_URL is not set
 * (useful for local dev — per-instance only, not for production).
 *
 * Usage:
 *   const rl = await rateLimitMulti("generate:userId", QUOTAS.generate);
 *   if (!rl.success) return 429;
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/* ─── Quota definitions ──────────────────────────────────────────────── */

export const QUOTAS = {
  // [perMinute, perHour, perDay]
  generate: [5, 30, 100] as const,
  analogy: [30, 200, 500] as const,
} as const;

/* ─── Upstash-backed limiters (multi-tier) ───────────────────────────── */

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
let limiters: Map<string, Ratelimit> = new Map();

if (upstashUrl && upstashToken) {
  redis = new Redis({ url: upstashUrl, token: upstashToken });
}

function getLimiter(identifier: string, maxRequests: number, windowSecs: number) {
  const key = `${identifier}:${maxRequests}:${windowSecs}`;
  let limiter = limiters.get(key);
  if (!limiter && redis) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSecs}s`),
      analytics: true,
      prefix: "seekho:rl",
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

/* ─── In-memory fallback (per-instance, dev only) ────────────────────── */

interface MemEntry { timestamps: number[] }
const memStore = new Map<string, MemEntry>();

function memLimit(identifier: string, maxRequests: number, windowSecs: number) {
  const now = Date.now();
  const windowMs = windowSecs * 1000;
  const entry = memStore.get(identifier) ?? { timestamps: [] };
  // Drop expired
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    return { success: false, reset: oldest + windowMs };
  }
  entry.timestamps.push(now);
  memStore.set(identifier, entry);
  return { success: true, reset: now + windowMs };
}

/* ─── Public API ─────────────────────────────────────────────────────── */

export interface RateLimitResult {
  success: boolean;
  reset: number; // epoch ms when the limit resets
}

/**
 * Check all tiers for a given identifier. Fails fast on the first tier
 * that's exhausted.
 *
 * @param identifier e.g. "generate:user-uuid"
 * @param tiers      e.g. [5, 30, 100]  (per-minute, per-hour, per-day)
 */
export async function rateLimitMulti(
  identifier: string,
  tiers: readonly number[],
): Promise<RateLimitResult> {
  const windows = [60, 3600, 86400]; // 1min, 1hr, 1day in seconds

  for (let i = 0; i < tiers.length; i++) {
    const max = tiers[i];
    const window = windows[i] ?? 86400;

    if (redis) {
      const limiter = getLimiter(identifier, max, window);
      if (limiter) {
        const { success, reset } = await limiter.limit(identifier);
        if (!success) {
          return { success: false, reset: reset * 1000 };
        }
      }
    } else {
      const tierKey = `${identifier}:t${i}`;
      const result = memLimit(tierKey, max, window);
      if (!result.success) return result;
    }
  }

  return { success: true, reset: Date.now() + 60000 };
}
