import { type CachedDataEntry } from "@/domain/entities/CachedDataEntry";
import { type DataType } from "@/domain/types/DataType";
import { type DateRange } from "@/domain/value-objects/DateRange";

/**
 * Cache statistics for monitoring and debugging
 */
export interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

/**
 * ICacheRepository - Abstraction for cache storage operations
 *
 * Purpose: Provides a clean interface for storing and retrieving cached
 * GitHub data with metadata for staleness detection and LRU eviction.
 *
 * Implementation Details:
 * - Primary implementation: IndexedDB (persistent, large capacity)
 * - Fallback implementation: In-memory Map (non-persistent, limited capacity)
 * - Graceful degradation: Safari private mode, QuotaExceededError
 */
export interface ICacheRepository {
  /**
   * Retrieve cached data by key
   *
   * @param key - Unique cache key (format: "repo:{owner}/{name}:type:{dataType}:range:{start}:{end}")
   * @returns CachedDataEntry if found and valid (regardless of staleness), null otherwise
   *
   * @example
   * const entry = await cache.get('repo:facebook/react:type:pull_requests:range:2026-01-07T...:2026-02-06T...');
   * if (entry && entry.isStale()) {
   *   // Serve stale data, trigger background refresh
   * }
   */
  get(key: string): Promise<CachedDataEntry | null>;

  /**
   * Retrieve all cached entries for a specific repository
   *
   * @param repositoryId - Repository identifier (format: "{owner}/{name}")
   * @returns Array of all cache entries for this repository
   *
   * @example
   * const entries = await cache.getByRepository('facebook/react');
   * // Returns all PRs, deployments, commits cached for facebook/react
   */
  getByRepository(repositoryId: string): Promise<CachedDataEntry[]>;

  /**
   * Retrieve cached data for specific data type and date range
   *
   * @param repositoryId - Repository identifier
   * @param dataType - Type of data (PRs, deployments, commits)
   * @param range - Date range to query
   * @returns CachedDataEntry if exact match found, null otherwise
   *
   * @example
   * const entry = await cache.getByDateRange(
   *   'facebook/react',
   *   DataType.PULL_REQUESTS,
   *   { start: new Date('2026-01-07'), end: new Date('2026-02-06') }
   * );
   */
  getByDateRange(
    repositoryId: string,
    dataType: DataType,
    range: DateRange,
  ): Promise<CachedDataEntry | null>;

  /**
   * Store data in cache with TTL
   *
   * @param entry - Complete cache entry with metadata
   * @throws Error if storage quota exceeded (QuotaExceededError in IndexedDB)
   * @throws Error if entry validation fails (invalid key format, negative size, etc.)
   *
   * @example
   * await cache.set(cachedEntry);
   */
  set(entry: CachedDataEntry): Promise<void>;

  /**
   * Store multiple cache entries atomically
   *
   * @param entries - Array of cache entries to store
   * @throws Error if storage quota exceeded
   *
   * @example
   * await cache.setMany([prEntry, deploymentEntry, commitEntry]);
   */
  setMany(entries: CachedDataEntry[]): Promise<void>;

  /**
   * Remove specific cache entries by keys
   *
   * @param keys - Array of cache keys to remove
   *
   * @example
   * await cache.evict([
   *   'repo:facebook/react:type:pull_requests:range:2025-01-01T...:2025-01-31T...',
   *   'repo:facebook/react:type:deployments:range:2025-01-01T...:2025-01-31T...',
   * ]);
   */
  evict(keys: string[]): Promise<void>;

  /**
   * Remove all stale cache entries (expiresAt < now)
   *
   * @returns Number of entries removed
   *
   * @example
   * const removedCount = await cache.evictStale();
   * console.log(`Removed ${removedCount} stale entries`);
   */
  evictStale(): Promise<number>;

  /**
   * Remove specific cache entry by key
   *
   * @param key - Cache key to remove
   *
   * @example
   * await cache.delete('repo:facebook/react:type:pull_requests:range:2026-01-07T...:2026-02-06T...');
   */
  delete(key: string): Promise<void>;

  /**
   * Remove all cache entries for a specific repository
   *
   * @param repositoryId - Repository identifier
   *
   * @example
   * await cache.clearRepository('facebook/react');
   */
  clearRepository(repositoryId: string): Promise<void>;

  /**
   * Remove all cached data (full cache clear)
   *
   * Warning: This operation is destructive and irreversible
   *
   * @example
   * await cache.clearAll();
   */
  clearAll(): Promise<void>;

  /**
   * Get all cache entries (for LRU eviction algorithm)
   *
   * @returns Array of all cached entries
   *
   * @example
   * const allEntries = await cache.getAll();
   * const toEvict = calculateEvictionCandidates(allEntries, targetBytes);
   * await cache.evict(toEvict.map(e => e.key.value));
   */
  getAll(): Promise<CachedDataEntry[]>;

  /**
   * Get cache statistics for monitoring and debugging
   *
   * @returns Cache statistics (total entries, size, oldest/newest entry timestamps)
   *
   * @example
   * const stats = await cache.getStats();
   * if (stats.totalSizeBytes > 40 * 1024 * 1024) {
   *   // Approaching 50MB limit, trigger eviction
   * }
   */
  getStats(): Promise<CacheStats>;

  /**
   * Get total size of all cached data in bytes
   *
   * @returns Total size in bytes
   *
   * @example
   * const totalSize = await cache.getTotalSize();
   * const percentUsed = (totalSize / (50 * 1024 * 1024)) * 100;
   */
  getTotalSize(): Promise<number>;

  /**
   * Get total number of cached entries
   *
   * @returns Total entry count
   *
   * @example
   * const count = await cache.getEntryCount();
   * if (count > 1000) {
   *   // Too many entries, trigger LRU eviction
   * }
   */
  getEntryCount(): Promise<number>;
}
