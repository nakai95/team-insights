import { type CachedDataEntry } from "@/domain/entities/CachedDataEntry";

/**
 * Cache configuration constants
 */
export const CacheConfig = {
  // TTL values
  ACTIVE_REPO_TTL: 60 * 60 * 1000, // 1 hour for active repositories
  ARCHIVED_REPO_TTL: 24 * 60 * 60 * 1000, // 24 hours for archived repositories
  HISTORICAL_DATA_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days for historical data (>90 days old)

  // Storage limits
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50 MB
  MAX_ENTRIES: 1000, // Maximum number of cache entries
  EVICTION_THRESHOLD: 0.8, // Trigger eviction at 80% capacity (40MB)
  EVICTION_TARGET: 0.6, // Evict down to 60% capacity (30MB)

  // Rate limit protection
  MIN_RATE_LIMIT_PERCENTAGE: 10, // Pause revalidation if < 10% API budget remaining

  // IndexedDB
  DB_NAME: "team-insights-cache",
  DB_VERSION: 1,
  STORE_NAME: "cache-entries",
} as const;

/**
 * CacheEvictionService
 *
 * Purpose: Implements Least Recently Used (LRU) eviction strategy for cache management
 *
 * Algorithm:
 * 1. Calculate priority score for each entry:
 *    priority = (accessCount * 2) + recencyScore - stalenessScore
 *    recencyScore = 100 * (1 - daysSinceAccess / 365)
 *    stalenessScore = isStale ? 50 : 0
 * 2. Sort entries by priority (ascending)
 * 3. Select lowest priority entries until target size reached
 *
 * Note: Since we don't track access count in CachedDataEntry, we use simplified scoring:
 *    priority = recencyScore - stalenessScore
 *    recencyScore = daysSinceAccess (lower is better)
 *    stalenessScore = isStale ? 1000 : 0 (stale entries have very high score = low priority)
 */
export class CacheEvictionService {
  /**
   * Determine if eviction is needed based on current cache size
   *
   * @param currentSizeBytes - Current total cache size in bytes
   * @param maxSizeBytes - Maximum allowed cache size
   * @returns true if currentSize >= 80% of maxSize
   *
   * @example
   * const shouldEvict = evictionService.shouldEvict(42000000, 50000000);
   * // Returns true (42MB >= 40MB threshold)
   */
  shouldEvict(currentSizeBytes: number, maxSizeBytes: number): boolean {
    const threshold = maxSizeBytes * CacheConfig.EVICTION_THRESHOLD;
    return currentSizeBytes >= threshold;
  }

  /**
   * Determine if eviction is needed based on entry count
   *
   * @param currentCount - Current number of cache entries
   * @param maxEntries - Maximum allowed entries
   * @returns true if currentCount >= 80% of maxEntries
   *
   * @example
   * const shouldEvict = evictionService.shouldEvictByCount(850, 1000);
   * // Returns true (850 >= 800 threshold)
   */
  shouldEvictByCount(currentCount: number, maxEntries: number): boolean {
    const threshold = maxEntries * CacheConfig.EVICTION_THRESHOLD;
    return currentCount >= threshold;
  }

  /**
   * Calculate which entries to evict to reach target size
   *
   * Uses LRU algorithm with staleness boost:
   * - Prioritizes stale entries for eviction
   * - Among fresh entries, evicts least recently accessed
   *
   * @param entries - All current cache entries
   * @param targetBytes - Target total size after eviction
   * @returns Array of entries to evict (sorted by priority, lowest first)
   *
   * @example
   * const toEvict = evictionService.calculateEvictionCandidates(
   *   allEntries,
   *   30 * 1024 * 1024 // Target: 30MB
   * );
   * await cache.evict(toEvict.map(e => e.key.value));
   */
  calculateEvictionCandidates(
    entries: CachedDataEntry[],
    targetBytes: number,
  ): CachedDataEntry[] {
    // Calculate current total size
    const currentSize = entries.reduce((sum, e) => sum + e.sizeBytes, 0);

    // If already below target, no eviction needed
    if (currentSize <= targetBytes) {
      return [];
    }

    // Calculate how many bytes we need to free
    const bytesToFree = currentSize - targetBytes;

    // Score each entry (higher score = higher eviction priority)
    const scoredEntries = entries.map((entry) => ({
      entry,
      score: this.calculateEvictionScore(entry),
    }));

    // Sort by score (descending = highest priority for eviction first)
    scoredEntries.sort((a, b) => b.score - a.score);

    // Select entries to evict until we've freed enough space
    const toEvict: CachedDataEntry[] = [];
    let freedBytes = 0;

    for (const { entry } of scoredEntries) {
      if (freedBytes >= bytesToFree) {
        break;
      }

      toEvict.push(entry);
      freedBytes += entry.sizeBytes;
    }

    return toEvict;
  }

  /**
   * Calculate which entries to evict based on entry count limit
   *
   * @param entries - All current cache entries
   * @param targetCount - Target number of entries after eviction
   * @returns Array of entries to evict
   *
   * @example
   * const toEvict = evictionService.calculateEvictionCandidatesByCount(
   *   allEntries,
   *   600 // Target: 600 entries
   * );
   */
  calculateEvictionCandidatesByCount(
    entries: CachedDataEntry[],
    targetCount: number,
  ): CachedDataEntry[] {
    // If already below target, no eviction needed
    if (entries.length <= targetCount) {
      return [];
    }

    // Calculate how many entries we need to remove
    const entriesToRemove = entries.length - targetCount;

    // Score each entry
    const scoredEntries = entries.map((entry) => ({
      entry,
      score: this.calculateEvictionScore(entry),
    }));

    // Sort by score (descending = highest priority for eviction first)
    scoredEntries.sort((a, b) => b.score - a.score);

    // Select top N entries for eviction
    return scoredEntries.slice(0, entriesToRemove).map((se) => se.entry);
  }

  /**
   * Calculate eviction priority score for an entry
   *
   * Higher score = higher priority for eviction (should be evicted first)
   *
   * Algorithm:
   * - Base score: days since last access (older = higher score)
   * - Staleness boost: +1000 if entry is stale (greatly increases eviction priority)
   * - Revalidating penalty: -500 if currently revalidating (reduces eviction priority)
   *
   * @param entry - Cache entry to score
   * @returns Priority score (higher = more likely to be evicted)
   *
   * @example
   * // Entry accessed 30 days ago, not stale
   * score = 30
   *
   * // Entry accessed 30 days ago, is stale
   * score = 30 + 1000 = 1030
   *
   * // Entry accessed 1 day ago, is stale, currently revalidating
   * score = 1 + 1000 - 500 = 501
   */
  private calculateEvictionScore(entry: CachedDataEntry): number {
    const now = new Date();

    // Base score: days since last access
    const daysSinceAccess =
      (now.getTime() - entry.lastAccessedAt.getTime()) / (24 * 60 * 60 * 1000);

    let score = daysSinceAccess;

    // Staleness boost: stale entries get very high priority for eviction
    if (entry.isStale()) {
      score += 1000;
    }

    // Revalidating penalty: don't evict entries being refreshed
    if (entry.isRevalidating) {
      score -= 500;
    }

    return score;
  }

  /**
   * Get all stale entries
   *
   * @param entries - All current cache entries
   * @returns Array of stale entries
   *
   * @example
   * const staleEntries = evictionService.getStaleEntries(allEntries);
   * await cache.evict(staleEntries.map(e => e.key.value));
   */
  getStaleEntries(entries: CachedDataEntry[]): CachedDataEntry[] {
    return entries.filter((entry) => entry.isStale());
  }

  /**
   * Calculate cache usage percentage
   *
   * @param currentSizeBytes - Current cache size
   * @param maxSizeBytes - Maximum cache size
   * @returns Usage percentage (0-100)
   *
   * @example
   * const usage = evictionService.calculateUsagePercentage(42000000, 50000000);
   * // Returns 84 (84%)
   */
  calculateUsagePercentage(
    currentSizeBytes: number,
    maxSizeBytes: number,
  ): number {
    return (currentSizeBytes / maxSizeBytes) * 100;
  }
}
