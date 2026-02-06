/**
 * CacheStatus enum using string literal pattern
 *
 * Represents the cache hit/miss/stale state for a data request.
 *
 * @example
 * if (status === CacheStatus.HIT_FRESH) {
 *   // Use cached data immediately
 * } else if (status === CacheStatus.HIT_STALE) {
 *   // Show cached data, trigger background refresh
 * }
 */
export const CacheStatus = {
  HIT_FRESH: "hit_fresh", // Cached data within TTL
  HIT_STALE: "hit_stale", // Cached data expired but served
  MISS: "miss", // No cached data available
  REVALIDATING: "revalidating", // Serving stale while fetching fresh
} as const;

export type CacheStatus = (typeof CacheStatus)[keyof typeof CacheStatus];
